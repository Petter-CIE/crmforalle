-- Phone number on the profile, and owners/admins may correct a colleague's name and phone.
alter table public.profiles add column phone text check (char_length(phone) <= 40);
grant select (phone), update (phone) on public.profiles to authenticated;

alter table public.invitations add column phone text check (char_length(phone) <= 40);

create or replace function public.update_member_profile(p_workspace uuid, p_user uuid, p_full_name text, p_phone text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_target_role public.member_role;
begin
  if not private.has_role(p_workspace, array['owner','admin']::public.member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select role into v_target_role from public.members where workspace_id = p_workspace and user_id = p_user;
  if not found then raise exception 'not a member' using errcode = '42501'; end if;
  -- the owner's details are only changed by the owner
  if v_target_role = 'owner' and p_user <> (select auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.profiles
     set full_name = nullif(left(btrim(p_full_name), 120), ''),
         phone = nullif(left(btrim(p_phone), 40), '')
   where id = p_user;
end; $$;
revoke all on function public.update_member_profile(uuid, uuid, text, text) from public, anon;
grant execute on function public.update_member_profile(uuid, uuid, text, text) to authenticated;

-- the invited person's phone from their own open invitation (offered on the invitation page)
create or replace function public.invitation_phone(p_token uuid)
returns text
language sql stable security definer set search_path = '' as $$
  select i.phone
    from public.invitations i
   where i.token = p_token and i.accepted_at is null and i.expires_at > now()
     and lower(i.email) = lower((select email from auth.users where id = (select auth.uid())));
$$;
revoke all on function public.invitation_phone(uuid) from public, anon;
grant execute on function public.invitation_phone(uuid) to authenticated;
