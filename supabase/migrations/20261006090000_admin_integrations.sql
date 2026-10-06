-- Status of every company's accounting integration for the platform admin (no credentials).
create or replace function public.admin_integrations()
returns table (
  workspace_id uuid, workspace_name text, provider text, external_company text,
  created_at timestamptz, last_sync_at timestamptz, last_error text
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
  select i.workspace_id, w.name, i.provider::text, i.external_company, i.created_at, i.last_sync_at, i.last_error
  from public.integrations i
  join public.workspaces w on w.id = i.workspace_id
  order by i.provider, w.name;
end;
$$;

revoke all on function public.admin_integrations() from public, anon;
grant execute on function public.admin_integrations() to authenticated;
