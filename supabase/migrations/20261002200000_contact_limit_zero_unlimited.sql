-- contact_limit = 0 means "unlimited" (set by platform admins, e.g. for free/partner access).
create or replace function private.enforce_contact_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
  v_count integer;
begin
  select contact_limit into v_limit from public.workspaces where id = new.workspace_id;
  if v_limit is null or v_limit <= 0 then
    return new;
  end if;
  select (select count(*) from public.companies where workspace_id = new.workspace_id)
       + (select count(*) from public.contacts where workspace_id = new.workspace_id)
    into v_count;
  if v_count >= v_limit then
    raise exception 'contact_limit_reached' using errcode = 'P0001', hint = v_limit::text;
  end if;
  return new;
end;
$$;
