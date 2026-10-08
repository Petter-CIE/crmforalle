-- New packaging (Oct 2026): Bedrift gets the team features, Start gets add-ons.
--   Start   249 kr: one pipeline, no automations, no project-limited users.
--           Add-ons: accounting (Tripletex/Fiken/PowerOffice) 99 kr, Outlook / Microsoft 365 sync 99 kr.
--   Bedrift 990 kr: everything, both add-ons included.
-- The free trial and the free plan include everything.

alter table public.workspaces add column outlook_addon boolean not null default false;
grant select (outlook_addon) on public.workspaces to authenticated;

-- Team features: several pipelines, automations, users limited to projects.
create or replace function private.has_team_features(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.workspaces w where w.id = ws and w.plan in ('bedrift', 'trial', 'free'));
$$;

-- Outlook / Microsoft 365 mail and calendar sync.
create or replace function private.has_outlook(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.workspaces w
                  where w.id = ws and (w.plan in ('bedrift', 'trial', 'free') or (w.plan = 'start' and w.outlook_addon)));
$$;

-- For the app (settings pages show what the plan includes).
create or replace function public.plan_features(p_workspace uuid)
returns table (team boolean, outlook boolean) language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_member(p_workspace) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select private.has_team_features(p_workspace), private.has_outlook(p_workspace);
end; $$;
revoke all on function public.plan_features(uuid) from public, anon;
grant execute on function public.plan_features(uuid) to authenticated;

-- Automations only run on plans with team features.
create or replace function private.run_deal_automations() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.stage_id is not distinct from old.stage_id then return null; end if;
  if not private.has_team_features(new.workspace_id) then return null; end if;
  insert into public.tasks (workspace_id, title, due_at, assignee_id, deal_id, company_id, contact_id)
  select new.workspace_id,
         left(a.task_title || ': ' || new.title, 300),
         (((now() at time zone 'Europe/Oslo')::date + a.due_days) + time '09:00') at time zone 'Europe/Oslo',
         coalesce(new.owner_id, new.created_by),
         new.id, new.company_id, new.contact_id
    from public.automations a
   where a.workspace_id = new.workspace_id and a.stage_id = new.stage_id and a.active;
  return null;
end; $$;

-- Outlook connections only sync when the plan includes Outlook (Google Calendar is in every plan).
create or replace function public.mail_claim(p_ticket text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.mail_tickets where token = p_ticket and applied_at is null and created_at > now() - interval '15 minutes') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update private.mail_tickets set applied_at = now() where token = p_ticket;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'provider', c.provider, 'workspace_id', c.workspace_id, 'user_id', c.user_id, 'refresh_token', c.refresh_token,
      'parent_id', c.parent_id, 'mailbox', c.mailbox,
      'mail', c.mail_enabled, 'calendar', c.calendar_enabled, 'synced_until', c.synced_until,
      'user_email', (select lower(email) from public.profiles where id = c.user_id))
      order by c.parent_id nulls first, c.created_at)
      from public.mail_connections c
      join public.workspaces w on w.id = c.workspace_id
     where w.suspended_at is null
       and (c.provider = 'google' or private.has_outlook(w.id))), '[]'::jsonb);
end; $$;

-- Ordering: the Outlook add-on is set together with the plan. Only Start can have it (Bedrift includes it).
create or replace function public.order_subscription_invoice_v2(
  p_workspace uuid, p_plan public.plan_type, p_interval text, p_addon boolean, p_outlook boolean, p_invoice_email text, p_reference text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.order_subscription(p_workspace, p_plan, p_interval, p_addon, p_invoice_email, p_reference);
  update public.workspaces
     set payment_method = 'invoice', outlook_addon = (p_plan = 'start' and coalesce(p_outlook, false))
   where id = p_workspace;
end; $$;
revoke all on function public.order_subscription_invoice_v2(uuid, public.plan_type, text, boolean, boolean, text, text) from public, anon;
grant execute on function public.order_subscription_invoice_v2(uuid, public.plan_type, text, boolean, boolean, text, text) to authenticated;

create or replace function public.stripe_activate_apply_v2(
  p_ticket text, p_plan public.plan_type, p_interval text, p_addon boolean, p_outlook boolean, p_email text,
  p_subscription text, p_customer text, p_period_end timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ws uuid;
begin
  select workspace_id into v_ws from private.stripe_tickets
   where token = p_ticket and kind = 'activate' and applied_at is null and created_at > now() - interval '15 minutes';
  perform public.stripe_activate_apply(p_ticket, p_plan, p_interval, p_addon, p_email, p_subscription, p_customer, p_period_end);
  update public.workspaces set outlook_addon = (p_plan = 'start' and coalesce(p_outlook, false)) where id = v_ws;
end; $$;
revoke all on function public.stripe_activate_apply_v2(text, public.plan_type, text, boolean, boolean, text, text, text, timestamptz) from public;
grant execute on function public.stripe_activate_apply_v2(text, public.plan_type, text, boolean, boolean, text, text, text, timestamptz) to anon, authenticated;

-- Platform admin: turn the Outlook add-on on or off (logged like other billing changes).
create or replace function public.admin_set_outlook_addon(p_id uuid, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare old_value boolean;
begin
  if not private.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select outlook_addon into old_value from public.workspaces where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if old_value is distinct from coalesce(p_on, false) then
    update public.workspaces set outlook_addon = coalesce(p_on, false) where id = p_id;
    insert into private.admin_audit (admin_id, workspace_id, changes)
    values ((select auth.uid()), p_id, jsonb_build_object('outlook_addon', jsonb_build_object('from', old_value, 'to', coalesce(p_on, false))));
  end if;
end; $$;
revoke all on function public.admin_set_outlook_addon(uuid, boolean) from public, anon;
grant execute on function public.admin_set_outlook_addon(uuid, boolean) to authenticated;

-- Admin list: which companies have the Outlook add-on (the main admin list function stays unchanged).
create or replace function public.admin_outlook_addons()
returns setof uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select id from public.workspaces where outlook_addon;
end; $$;
revoke all on function public.admin_outlook_addons() from public, anon;
grant execute on function public.admin_outlook_addons() to authenticated;
