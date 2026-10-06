-- The inviter can give the colleague's name; it is offered to them when they accept.
alter table public.invitations add column full_name text check (char_length(full_name) <= 120);

-- What the invited (signed-in) person may see about their own open invitation.
create or replace function public.invitation_preview(p_token uuid)
returns table (workspace_name text, full_name text)
language sql stable security definer set search_path = '' as $$
  select w.name, i.full_name
    from public.invitations i
    join public.workspaces w on w.id = i.workspace_id
   where i.token = p_token and i.accepted_at is null and i.expires_at > now()
     and lower(i.email) = lower((select email from auth.users where id = (select auth.uid())));
$$;
revoke all on function public.invitation_preview(uuid) from public, anon;
grant execute on function public.invitation_preview(uuid) to authenticated;
