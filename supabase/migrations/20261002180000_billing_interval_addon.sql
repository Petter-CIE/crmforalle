-- Yearly billing (12 months for the price of 10) and the accounting add-on (+50 kr on Start).
alter table public.workspaces
  add column billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  add column accounting_addon boolean not null default false;

grant select (billing_interval, accounting_addon) on public.workspaces to authenticated;

create or replace function public.admin_update_billing(p_id uuid, p_interval text, p_addon boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row public.workspaces;
  diff jsonb := '{}'::jsonb;
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_interval not in ('month', 'year') then
    raise exception 'invalid_interval';
  end if;
  select * into old_row from public.workspaces where id = p_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  update public.workspaces set billing_interval = p_interval, accounting_addon = coalesce(p_addon, false) where id = p_id;
  if old_row.billing_interval is distinct from p_interval then
    diff := diff || jsonb_build_object('billing_interval', jsonb_build_object('from', old_row.billing_interval, 'to', p_interval));
  end if;
  if old_row.accounting_addon is distinct from coalesce(p_addon, false) then
    diff := diff || jsonb_build_object('accounting_addon', jsonb_build_object('from', old_row.accounting_addon, 'to', coalesce(p_addon, false)));
  end if;
  if diff <> '{}'::jsonb then
    insert into private.admin_audit (admin_id, workspace_id, changes) values ((select auth.uid()), p_id, diff);
  end if;
end;
$$;
revoke all on function public.admin_update_billing(uuid, text, boolean) from public, anon;
grant execute on function public.admin_update_billing(uuid, text, boolean) to authenticated;

-- admin_workspaces plus the billing fields
create or replace function public.admin_workspaces_v2()
returns table (
  id uuid, name text, org_number text, plan public.plan_type, trial_ends_at timestamptz,
  contact_limit integer, discount_percent integer, discount_until date, discount_note text,
  admin_note text, suspended_at timestamptz, created_at timestamptz,
  owner_email text, owner_name text, member_count bigint, contact_count bigint, last_activity timestamptz,
  billing_interval text, accounting_addon boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select a.*, w.billing_interval, w.accounting_addon
  from public.admin_workspaces() a
  join public.workspaces w on w.id = a.id
  order by a.created_at desc;
end;
$$;
revoke all on function public.admin_workspaces_v2() from public, anon;
grant execute on function public.admin_workspaces_v2() to authenticated;
