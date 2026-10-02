-- Lets a signed-in user see open invitations sent to their own e-mail address,
-- so onboarding can offer "join" instead of creating a new company.
create or replace function public.my_invitations()
returns table (token uuid, workspace_name text, role public.member_role, invited_by_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select i.token, w.name, i.role, coalesce(p.full_name, p.email)
  from public.invitations i
  join public.workspaces w on w.id = i.workspace_id
  left join public.profiles p on p.id = i.invited_by
  where i.accepted_at is null
    and i.expires_at > now()
    and lower(i.email) = lower((select u.email from auth.users u where u.id = (select auth.uid())))
    and not exists (select 1 from public.members m where m.workspace_id = i.workspace_id and m.user_id = (select auth.uid()))
  order by i.created_at desc;
$$;
revoke all on function public.my_invitations() from public, anon;
grant execute on function public.my_invitations() to authenticated;
