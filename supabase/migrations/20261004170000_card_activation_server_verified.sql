-- Card activation may only happen after the server has checked the payment with Stripe.
-- Before: the browser-facing RPCs activate_card_subscription / set_stripe_customer could be called
-- directly by an owner with made-up ids. Now the app only asks the database to start a check; the
-- database calls the app back with a one-time ticket, the app verifies the Checkout session with
-- Stripe and applies the result through the ticket (same pattern as the nightly jobs).

-- 1) Order logic without the role check, so the ticketed activation can reuse it.
create or replace function private.order_subscription_core(
  p_workspace uuid, p_plan public.plan_type, p_interval text, p_addon boolean, p_invoice_email text, p_reference text, p_by uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare w public.workspaces; v_limit integer; v_count integer;
begin
  if p_plan not in ('start', 'bedrift') or p_interval not in ('month', 'year') then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if coalesce(p_invoice_email, '') !~ '^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  select * into w from public.workspaces where id = p_workspace for update;
  if not found then raise exception 'not_found' using errcode = '22023'; end if;
  v_limit := case when w.plan = p_plan then w.contact_limit when p_plan = 'start' then 2000 else 25000 end;
  if v_limit > 0 then
    select (select count(*) from public.companies where workspace_id = p_workspace)
         + (select count(*) from public.contacts where workspace_id = p_workspace) into v_count;
    if v_count > v_limit + coalesce(w.extra_contact_packs, 0) * (case when p_plan = 'start' then 2000 else 25000 end) then
      raise exception 'too_many_contacts' using errcode = '22023';
    end if;
  end if;
  update public.workspaces
     set plan = p_plan,
         billing_interval = p_interval,
         accounting_addon = (p_plan = 'start' and coalesce(p_addon, false)),
         contact_limit = v_limit,
         invoice_email = lower(btrim(p_invoice_email)),
         invoice_reference = nullif(left(btrim(coalesce(p_reference, '')), 100), ''),
         ordered_at = now(),
         ordered_by = p_by
   where id = p_workspace;
end; $$;
revoke all on function private.order_subscription_core(uuid, public.plan_type, text, boolean, text, text, uuid) from public;

create or replace function public.order_subscription(
  p_workspace uuid, p_plan public.plan_type, p_interval text, p_addon boolean, p_invoice_email text, p_reference text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_role(p_workspace, array['owner','admin']::public.member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform private.order_subscription_core(p_workspace, p_plan, p_interval, p_addon, p_invoice_email, p_reference, (select auth.uid()));
end; $$;
-- Only used through order_subscription_invoice (which marks the payment method).
revoke execute on function public.order_subscription(uuid, public.plan_type, text, boolean, text, text) from authenticated, anon, public;

-- 2) The old browser-callable card functions are closed.
revoke execute on function public.activate_card_subscription(uuid, public.plan_type, text, boolean, text, text, timestamptz) from authenticated, anon, public;
revoke execute on function public.set_stripe_customer(uuid, text) from authenticated, anon, public;

-- 3) Tickets now have a kind: the nightly sync, or the check of one Checkout session.
alter table private.stripe_tickets
  add column if not exists kind text not null default 'sync' check (kind in ('sync', 'activate')),
  add column if not exists workspace_id uuid,
  add column if not exists session_id text,
  add column if not exists requested_by uuid;

create or replace function public.stripe_claim(p_ticket text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.stripe_tickets where token = p_ticket and kind = 'sync' and applied_at is null and created_at > now() - interval '15 minutes') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('workspace_id', id, 'subscription', stripe_subscription_id))
                     from public.workspaces where stripe_subscription_id is not null and payment_method = 'card'), '[]'::jsonb);
end; $$;

create or replace function public.stripe_apply(p_ticket text, p_items jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare it jsonb; n integer := 0;
begin
  update private.stripe_tickets set applied_at = now() where token = p_ticket and kind = 'sync' and applied_at is null and created_at > now() - interval '15 minutes';
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    update public.workspaces
       set card_status = it->>'status',
           card_period_end = nullif(it->>'period_end', '')::timestamptz
     where id = (it->>'workspace_id')::uuid and stripe_subscription_id = it->>'subscription';
    if it->>'status' in ('canceled', 'unpaid', 'incomplete_expired') then
      update public.workspaces
         set plan = 'trial', trial_ends_at = least(trial_ends_at, now()), payment_method = null
       where id = (it->>'workspace_id')::uuid and stripe_subscription_id = it->>'subscription' and payment_method = 'card';
      n := n + 1;
    end if;
  end loop;
  return n;
end; $$;

-- 4) The owner is back from Checkout: start the server-side check (harmless on its own; nothing is
--    activated unless Stripe confirms a paid session that belongs to this company).
create or replace function public.card_checkout_verify(p_workspace uuid, p_session text) returns void
language plpgsql security definer set search_path = '' as $$
declare ticket text;
begin
  if not private.has_role(p_workspace, array['owner','admin']::public.member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_session !~ '^cs_[A-Za-z0-9_]{10,250}$' then raise exception 'invalid' using errcode = '22023'; end if;
  if (select count(*) from private.stripe_tickets where workspace_id = p_workspace and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'rate_limited' using errcode = '22023';
  end if;
  ticket := encode(extensions.gen_random_bytes(24), 'hex');
  insert into private.stripe_tickets (token, kind, workspace_id, session_id, requested_by)
  values (ticket, 'activate', p_workspace, p_session, (select auth.uid()));
  perform net.http_get(url := 'https://allseats.no/api/cron/stripe-activate?ticket=' || ticket, timeout_milliseconds := 30000);
end; $$;
revoke all on function public.card_checkout_verify(uuid, text) from public;
grant execute on function public.card_checkout_verify(uuid, text) to authenticated;

-- What the app needs to check the session (only with a fresh, unused activation ticket).
create or replace function public.stripe_activate_claim(p_ticket text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  select t.workspace_id, t.session_id, w.name, w.org_number, coalesce(w.extra_contact_packs, 0) as packs, u.email as requested_by
    into r
    from private.stripe_tickets t
    join public.workspaces w on w.id = t.workspace_id
    left join auth.users u on u.id = t.requested_by
   where t.token = p_ticket and t.kind = 'activate' and t.applied_at is null and t.created_at > now() - interval '15 minutes';
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object('workspace_id', r.workspace_id, 'session_id', r.session_id, 'name', r.name,
                            'org_number', r.org_number, 'packs', r.packs, 'requested_by', r.requested_by);
end; $$;

-- Applies a session the app has verified with Stripe. One use per ticket.
create or replace function public.stripe_activate_apply(
  p_ticket text, p_plan public.plan_type, p_interval text, p_addon boolean, p_email text,
  p_subscription text, p_customer text, p_period_end timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ws uuid; v_by uuid;
begin
  update private.stripe_tickets set applied_at = now()
   where token = p_ticket and kind = 'activate' and applied_at is null and created_at > now() - interval '15 minutes'
  returning workspace_id, requested_by into v_ws, v_by;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_subscription !~ '^sub_[A-Za-z0-9]+$' or p_customer !~ '^cus_[A-Za-z0-9]+$' then
    raise exception 'invalid' using errcode = '22023';
  end if;
  perform private.order_subscription_core(v_ws, p_plan, p_interval, p_addon, p_email, null, v_by);
  update public.workspaces
     set payment_method = 'card', stripe_subscription_id = p_subscription, stripe_customer_id = p_customer,
         card_status = 'active', card_period_end = p_period_end
   where id = v_ws;
end; $$;
revoke all on function public.stripe_activate_claim(text) from public;
revoke all on function public.stripe_activate_apply(text, public.plan_type, text, boolean, text, text, text, timestamptz) from public;
grant execute on function public.stripe_activate_claim(text) to anon, authenticated;
grant execute on function public.stripe_activate_apply(text, public.plan_type, text, boolean, text, text, text, timestamptz) to anon, authenticated;
