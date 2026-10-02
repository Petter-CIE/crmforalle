-- Record which version of the terms of service + DPA a company accepted, when, and by whom.
alter table public.workspaces
  add column terms_version text,
  add column terms_accepted_at timestamptz,
  add column terms_accepted_by uuid references public.profiles(id) on delete set null;
create index workspaces_terms_accepted_by_idx on public.workspaces(terms_accepted_by);

grant select (terms_version, terms_accepted_at, terms_accepted_by) on public.workspaces to authenticated;

-- Only the company's owner can accept the terms and DPA on its behalf; the time is set by the database.
create or replace function public.accept_terms(p_workspace uuid, p_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role(p_workspace, array['owner']::public.member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_version is null or char_length(p_version) > 40 then
    raise exception 'invalid_version';
  end if;
  update public.workspaces
     set terms_version = p_version, terms_accepted_at = now(), terms_accepted_by = (select auth.uid())
   where id = p_workspace;
end;
$$;
revoke all on function public.accept_terms(uuid, text) from public, anon;
grant execute on function public.accept_terms(uuid, text) to authenticated;
