-- Platform admin: permanently delete a company's CRM data, or the whole company.
-- Per-workspace audit rows cascade away with the company, so deletions are logged separately.
create table private.admin_deletions (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('data', 'workspace')),
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

-- Admins may list and remove attachment files of any company (needed to delete them with the data).
create policy attachments_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and private.is_platform_admin());
create policy attachments_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and private.is_platform_admin());

-- Shared checks + log. Returns the locked workspace row.
create or replace function private.admin_deletion_start(p_id uuid, p_confirm_name text, p_kind text)
returns public.workspaces language plpgsql security definer set search_path = '' as $$
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
  insert into private.admin_deletions (kind, admin_id, workspace_id, workspace_name, org_number, plan, member_count, contact_count)
  values (p_kind, (select auth.uid()), w.id, w.name, w.org_number, w.plan::text,
          (select count(*) from public.members m where m.workspace_id = w.id),
          (select count(*) from public.contacts c where c.workspace_id = w.id));
  return w;
end; $$;
revoke all on function private.admin_deletion_start(uuid, text, text) from public, anon, authenticated;

-- Deletes all CRM data but keeps the company, its users, plan and pipeline stages.
-- Returns the storage paths of attachment files, which the caller removes from storage.
create or replace function public.admin_wipe_workspace_data(p_id uuid, p_confirm_name text)
returns text[] language plpgsql security definer set search_path = '' as $$
declare paths text[];
begin
  perform private.admin_deletion_start(p_id, p_confirm_name, 'data');
  select coalesce(array_agg(path), '{}') into paths from public.task_attachments where workspace_id = p_id;
  delete from public.task_attachments where workspace_id = p_id;
  delete from public.task_comments where workspace_id = p_id;
  delete from public.task_members where workspace_id = p_id;
  delete from public.activities where workspace_id = p_id;
  delete from public.tasks where workspace_id = p_id;
  delete from public.deals where workspace_id = p_id;
  delete from public.project_contacts where workspace_id = p_id;
  delete from public.project_companies where workspace_id = p_id;
  delete from public.projects where workspace_id = p_id;
  delete from public.inbound_emails where workspace_id = p_id;
  delete from public.external_invoices where workspace_id = p_id;
  delete from public.integration_links where workspace_id = p_id;
  delete from public.integrations where workspace_id = p_id;
  delete from public.contacts where workspace_id = p_id;
  delete from public.companies where workspace_id = p_id;
  insert into private.admin_audit (admin_id, workspace_id, changes)
  values ((select auth.uid()), p_id, jsonb_build_object('data_deleted', true));
  return paths;
end; $$;
revoke all on function public.admin_wipe_workspace_data(uuid, text) from public, anon;
grant execute on function public.admin_wipe_workspace_data(uuid, text) to authenticated;

-- Deletes the company with everything in it. User accounts are kept.
create or replace function public.admin_delete_workspace(p_id uuid, p_confirm_name text)
returns text[] language plpgsql security definer set search_path = '' as $$
declare paths text[];
begin
  perform private.admin_deletion_start(p_id, p_confirm_name, 'workspace');
  select coalesce(array_agg(path), '{}') into paths from public.task_attachments where workspace_id = p_id;
  delete from public.workspaces where id = p_id;
  return paths;
end; $$;
revoke all on function public.admin_delete_workspace(uuid, text) from public, anon;
grant execute on function public.admin_delete_workspace(uuid, text) to authenticated;
