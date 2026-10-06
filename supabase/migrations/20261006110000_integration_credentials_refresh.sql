-- OAuth integrations (Fiken) get new tokens while syncing. Any member's sync may store them,
-- but only while it holds the sync slot; owners and admins may always (connect, pick company).
create or replace function public.integration_update_credentials(p_workspace uuid, p_provider text, p_credentials text, p_company text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_member(p_workspace) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.integrations
     set credentials = p_credentials,
         external_company = coalesce(left(p_company, 200), external_company)
   where workspace_id = p_workspace and provider = p_provider
     and (private.has_role(p_workspace, array['owner','admin']::public.member_role[])
          or sync_started_at > now() - interval '3 minutes');
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end; $$;

revoke all on function public.integration_update_credentials(uuid, text, text, text) from public, anon;
grant execute on function public.integration_update_credentials(uuid, text, text, text) to authenticated;
