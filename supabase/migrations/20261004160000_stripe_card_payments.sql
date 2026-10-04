-- Card payments with Stripe (alongside invoice). Activation happens when the owner returns from
-- Stripe Checkout (the app verifies the session with Stripe first); a daily job keeps the status in sync.

alter table public.workspaces
  add column if not exists payment_method text check (payment_method in ('invoice', 'card')),
  add column if not exists stripe_subscription_id text,
  add column if not exists card_status text,
  add column if not exists card_period_end timestamptz;
grant select (payment_method, stripe_subscription_id, card_status, card_period_end) on public.workspaces to authenticated;

update public.workspaces set payment_method = 'invoice' where plan in ('start', 'bedrift') and payment_method is null;

-- Invoice orders mark the payment method.
create or replace function public.order_subscription_invoice(
  p_workspace uuid, p_plan public.plan_type, p_interval text, p_addon boolean, p_invoice_email text, p_reference text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.order_subscription(p_workspace, p_plan, p_interval, p_addon, p_invoice_email, p_reference);
  update public.workspaces set payment_method = 'invoice' where id = p_workspace;
end; $$;
revoke all on function public.order_subscription_invoice(uuid, public.plan_type, text, boolean, text, text) from public;
grant execute on function public.order_subscription_invoice(uuid, public.plan_type, text, boolean, text, text) to authenticated;

-- The Stripe customer for the company (created by the app the first time someone pays by card).
create or replace function public.set_stripe_customer(p_workspace uuid, p_customer text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_role(p_workspace, array['owner','admin']::public.member_role[]) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_customer !~ '^cus_[A-Za-z0-9]+$' then raise exception 'invalid' using errcode = '22023'; end if;
  update public.workspaces set stripe_customer_id = p_customer where id = p_workspace;
end; $$;
revoke all on function public.set_stripe_customer(uuid, text) from public;
grant execute on function public.set_stripe_customer(uuid, text) to authenticated;

-- Called after the app has verified the Checkout session with Stripe.
create or replace function public.activate_card_subscription(
  p_workspace uuid, p_plan public.plan_type, p_interval text, p_addon boolean, p_email text, p_subscription text, p_period_end timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_subscription !~ '^sub_[A-Za-z0-9]+$' then raise exception 'invalid' using errcode = '22023'; end if;
  perform public.order_subscription(p_workspace, p_plan, p_interval, p_addon, p_email, null);
  update public.workspaces
     set payment_method = 'card', stripe_subscription_id = p_subscription, card_status = 'active', card_period_end = p_period_end
   where id = p_workspace;
end; $$;
revoke all on function public.activate_card_subscription(uuid, public.plan_type, text, boolean, text, text, timestamptz) from public;
grant execute on function public.activate_card_subscription(uuid, public.plan_type, text, boolean, text, text, timestamptz) to authenticated;

-- Daily status sync (ticket pattern, like the digest and the Brønnøysund watch).
create table private.stripe_tickets (token text primary key, created_at timestamptz not null default now(), applied_at timestamptz);
alter table private.stripe_tickets enable row level security;

create or replace function private.stripe_kick() returns void
language plpgsql security definer set search_path = '' as $$
declare ticket text;
begin
  if not exists (select 1 from public.workspaces where stripe_subscription_id is not null) then return; end if;
  ticket := encode(extensions.gen_random_bytes(24), 'hex');
  insert into private.stripe_tickets (token) values (ticket);
  perform net.http_get(url := 'https://allseats.no/api/cron/stripe?ticket=' || ticket, timeout_milliseconds := 55000);
end; $$;

create or replace function public.stripe_claim(p_ticket text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.stripe_tickets where token = p_ticket and applied_at is null and created_at > now() - interval '15 minutes') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('workspace_id', id, 'subscription', stripe_subscription_id))
                     from public.workspaces where stripe_subscription_id is not null and payment_method = 'card'), '[]'::jsonb);
end; $$;

-- items: [{workspace_id, subscription, status, period_end}]. A cancelled or unpaid subscription ends the plan
-- (the company becomes read-only, like after the trial) until a new subscription is chosen.
create or replace function public.stripe_apply(p_ticket text, p_items jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare it jsonb; n integer := 0;
begin
  update private.stripe_tickets set applied_at = now() where token = p_ticket and applied_at is null and created_at > now() - interval '15 minutes';
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
revoke all on function public.stripe_claim(text) from public;
revoke all on function public.stripe_apply(text, jsonb) from public;
grant execute on function public.stripe_claim(text) to anon, authenticated;
grant execute on function public.stripe_apply(text, jsonb) to anon, authenticated;

select cron.schedule('allseats-stripe-sync', '20 3 * * *', 'select private.stripe_kick()');
