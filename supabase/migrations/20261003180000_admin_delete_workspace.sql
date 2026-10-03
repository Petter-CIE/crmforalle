-- Platform admin: permanently delete a company (workspace) and all its data.
-- The per-workspace audit rows cascade away, so deletions are logged separately.
create table private.admin_deletions (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id) on delete set null,
  workspace_id uuid not null,
  workspace_name text not null,
  org_number text,
  plan text,
  member_count integer,
  contact_count integer,
  deleted_at timestamptz not null default now()
);
alter table private.admin_deletions enable row level security;

create or replace function public.admin_delete_workspace(p_id uuid, p_confirm_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare w public.workspaces;
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into w from public.workspaces where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if btrim(coalesce(p_confirm_name, '')) <> w.name then
    raise exception 'name_mismatch';
  end if;
  insert into private.admin_deletions (admin_id, workspace_id, workspace_name, org_number, plan, member_count, contact_count)
  values ((select auth.uid()), w.id, w.name, w.org_number, w.plan::text,
          (select count(*) from public.members m where m.workspace_id = w.id),
          (select count(*) from public.contacts c where c.workspace_id = w.id));
  delete from public.workspaces where id = p_id;
end; $$;
revoke all on function public.admin_delete_workspace(uuid, text) from public, anon;
grant execute on function public.admin_delete_workspace(uuid, text) to authenticated;
