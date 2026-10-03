-- Every company gets its CRM e-mail address automatically.
create or replace function private.new_inbound_token()
returns text language sql volatile set search_path = '' as $$
  select array_to_string(array(
    select substr('abcdefghijkmnpqrstuvwxyz23456789', get_byte(uuid_send(gen_random_uuid()), 0) % 32 + 1, 1)
    from generate_series(1, 10)
  ), '');
$$;

create or replace function private.set_inbound_token()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.inbound_token is null then new.inbound_token := private.new_inbound_token(); end if;
  return new;
end; $$;
revoke all on function private.set_inbound_token() from public;
create trigger workspaces_inbound_token before insert on public.workspaces
  for each row execute function private.set_inbound_token();
update public.workspaces set inbound_token = private.new_inbound_token() where inbound_token is null;

create or replace function public.rotate_inbound_token(p_workspace uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  if not private.has_role(p_workspace, array['owner','admin']::public.member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v := private.new_inbound_token();
  update public.workspaces set inbound_token = v where id = p_workspace;
  return v;
end; $$;
