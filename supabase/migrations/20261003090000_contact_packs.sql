-- Extra contact packs: Start +2 000 per pack (max 2), Bedrift +25 000 per pack.
alter table public.workspaces add column extra_contact_packs integer not null default 0
  check (extra_contact_packs between 0 and 100);
grant select (extra_contact_packs) on public.workspaces to authenticated;

create or replace function private.contact_pack_size(p public.plan_type)
returns integer language sql immutable set search_path = '' as $$
  select case p when 'start' then 2000 when 'bedrift' then 25000 else 0 end;
$$;

create or replace function private.enforce_contact_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_limit integer; v_count integer;
begin
  select case when w.contact_limit <= 0 then 0
              else w.contact_limit + w.extra_contact_packs * private.contact_pack_size(w.plan) end
    into v_limit
  from public.workspaces w where w.id = new.workspace_id;
  if v_limit is null or v_limit <= 0 then return new; end if;
  select (select count(*) from public.companies where workspace_id = new.workspace_id)
       + (select count(*) from public.contacts where workspace_id = new.workspace_id) into v_count;
  if v_count >= v_limit then raise exception 'contact_limit_reached' using errcode = 'P0001', hint = v_limit::text; end if;
  return new;
end; $$;

create or replace function public.admin_update_packs(p_id uuid, p_packs integer)
returns void language plpgsql security definer set search_path = '' as $$
declare old_row public.workspaces;
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into old_row from public.workspaces where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if p_packs < 0
     or (old_row.plan = 'start' and p_packs > 2)
     or (old_row.plan = 'bedrift' and p_packs > 100)
     or (old_row.plan not in ('start', 'bedrift') and p_packs > 0) then
    raise exception 'invalid_packs';
  end if;
  if old_row.extra_contact_packs is distinct from p_packs then
    update public.workspaces set extra_contact_packs = p_packs where id = p_id;
    insert into private.admin_audit (admin_id, workspace_id, changes)
    values ((select auth.uid()), p_id,
            jsonb_build_object('extra_contact_packs', jsonb_build_object('from', old_row.extra_contact_packs, 'to', p_packs)));
  end if;
end; $$;
revoke all on function public.admin_update_packs(uuid, integer) from public, anon;
grant execute on function public.admin_update_packs(uuid, integer) to authenticated;

create or replace function public.admin_workspaces_v3()
returns table (
  id uuid, name text, org_number text, plan public.plan_type, trial_ends_at timestamptz,
  contact_limit integer, discount_percent integer, discount_until date, discount_note text,
  admin_note text, suspended_at timestamptz, created_at timestamptz,
  owner_email text, owner_name text, member_count bigint, contact_count bigint, last_activity timestamptz,
  billing_interval text, accounting_addon boolean, extra_contact_packs integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select a.*, w.extra_contact_packs
  from public.admin_workspaces_v2() a
  join public.workspaces w on w.id = a.id
  order by a.created_at desc;
end; $$;
revoke all on function public.admin_workspaces_v3() from public, anon;
grant execute on function public.admin_workspaces_v3() to authenticated;
