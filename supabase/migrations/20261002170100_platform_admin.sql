-- Platform administration (for the people running AllSeats CRM, not for customer admins).
-- Admins live in a private table; everything goes through SECURITY DEFINER functions that
-- require the caller to be a platform admin signed in with two-factor (aal2).

alter table public.workspaces
  add column discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  add column discount_until date,
  add column discount_note text check (char_length(discount_note) <= 500),
  add column admin_note text check (char_length(admin_note) <= 5000),
  add column suspended_at timestamptz;

create table private.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table private.admin_audit (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  changes jsonb not null,
  created_at timestamptz not null default now()
);
create index admin_audit_workspace_idx on private.admin_audit(workspace_id, created_at desc);

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.platform_admins a where a.user_id = (select auth.uid()))
     and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2';
$$;

-- What the UI needs to know: is this user an admin, and is the session strong enough?
create or replace function public.platform_admin_status()
returns table (is_admin boolean, has_aal2 boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.platform_admins a where a.user_id = (select auth.uid())),
         coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2';
$$;

create or replace function public.admin_workspaces()
returns table (
  id uuid, name text, org_number text, plan public.plan_type, trial_ends_at timestamptz,
  contact_limit integer, discount_percent integer, discount_until date, discount_note text,
  admin_note text, suspended_at timestamptz, created_at timestamptz,
  owner_email text, owner_name text, member_count bigint, contact_count bigint, last_activity timestamptz
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
  select w.id, w.name, w.org_number, w.plan, w.trial_ends_at, w.contact_limit, w.discount_percent,
         w.discount_until, w.discount_note, w.admin_note, w.suspended_at, w.created_at,
         o.email, o.full_name,
         (select count(*) from public.members m where m.workspace_id = w.id),
         (select count(*) from public.contacts c where c.workspace_id = w.id),
         greatest(
           (select max(a.created_at) from public.activities a where a.workspace_id = w.id),
           (select max(t.updated_at) from public.tasks t where t.workspace_id = w.id),
           (select max(d.updated_at) from public.deals d where d.workspace_id = w.id)
         )
  from public.workspaces w
  left join lateral (
    select p.email, p.full_name from public.members m join public.profiles p on p.id = m.user_id
    where m.workspace_id = w.id and m.role = 'owner' order by m.created_at limit 1
  ) o on true
  order by w.created_at desc;
end;
$$;

create or replace function public.admin_workspace_members(p_id uuid)
returns table (user_id uuid, email text, full_name text, role public.member_role, joined_at timestamptz, last_sign_in_at timestamptz)
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
  select m.user_id, p.email, p.full_name, m.role, m.created_at, u.last_sign_in_at
  from public.members m
  join public.profiles p on p.id = m.user_id
  left join auth.users u on u.id = m.user_id
  where m.workspace_id = p_id
  order by m.role, m.created_at;
end;
$$;

create or replace function public.admin_audit_log(p_id uuid)
returns table (created_at timestamptz, admin_email text, changes jsonb)
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
  select a.created_at, p.email, a.changes
  from private.admin_audit a left join public.profiles p on p.id = a.admin_id
  where a.workspace_id = p_id
  order by a.created_at desc
  limit 100;
end;
$$;

create or replace function public.admin_update_workspace(
  p_id uuid,
  p_plan public.plan_type,
  p_trial_ends_at timestamptz,
  p_contact_limit integer,
  p_discount_percent integer,
  p_discount_until date,
  p_discount_note text,
  p_admin_note text,
  p_suspended boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row public.workspaces;
  new_row public.workspaces;
  diff jsonb;
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into old_row from public.workspaces where id = p_id for update;
  if not found then
    raise exception 'not_found';
  end if;

  update public.workspaces set
    plan = p_plan,
    trial_ends_at = p_trial_ends_at,
    contact_limit = greatest(0, p_contact_limit),
    discount_percent = least(100, greatest(0, coalesce(p_discount_percent, 0))),
    discount_until = p_discount_until,
    discount_note = nullif(trim(p_discount_note), ''),
    admin_note = nullif(trim(p_admin_note), ''),
    suspended_at = case when p_suspended then coalesce(old_row.suspended_at, now()) else null end
  where id = p_id
  returning * into new_row;

  select coalesce(jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value)), '{}'::jsonb)
  into diff
  from jsonb_each(to_jsonb(new_row)) n
  join jsonb_each(to_jsonb(old_row)) o on o.key = n.key
  where n.value is distinct from o.value;

  if diff <> '{}'::jsonb then
    insert into private.admin_audit (admin_id, workspace_id, changes) values ((select auth.uid()), p_id, diff);
  end if;
end;
$$;

revoke all on function private.is_platform_admin() from public;
revoke all on function public.platform_admin_status() from public, anon;
revoke all on function public.admin_workspaces() from public, anon;
revoke all on function public.admin_workspace_members(uuid) from public, anon;
revoke all on function public.admin_audit_log(uuid) from public, anon;
revoke all on function public.admin_update_workspace(uuid, public.plan_type, timestamptz, integer, integer, date, text, text, boolean) from public, anon;
grant execute on function public.platform_admin_status() to authenticated;
grant execute on function public.admin_workspaces() to authenticated;
grant execute on function public.admin_workspace_members(uuid) to authenticated;
grant execute on function public.admin_audit_log(uuid) to authenticated;
grant execute on function public.admin_update_workspace(uuid, public.plan_type, timestamptz, integer, integer, date, text, text, boolean) to authenticated;

-- Internal admin notes must not be readable by customers.
revoke select on public.workspaces from authenticated, anon;
grant select (id, name, org_number, plan, contact_limit, stripe_customer_id, trial_ends_at, created_by, created_at,
              discount_percent, discount_until, suspended_at)
  on public.workspaces to authenticated;
