-- Delegation: project owners, tasks linked to projects, member checks and e-mail notification opt-out.

-- Project owner (project lead) ------------------------------------------------
alter table public.projects
  add column owner_id uuid references public.profiles(id) on delete set null;
create index projects_owner_idx on public.projects(owner_id);
update public.projects set owner_id = created_by where owner_id is null;

-- Tasks can belong to a project ------------------------------------------------
alter table public.tasks
  add column project_id uuid,
  add constraint tasks_project_fk foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id) on delete set null (project_id);
create index tasks_project_idx on public.tasks(project_id);

-- Owners / assignees must be members of the same workspace ---------------------
-- Prevents assigning work (and sending notification e-mails) to outsiders.
create or replace function private.check_member_ref()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  col text := tg_argv[0];
  ref uuid := (to_jsonb(new) ->> col)::uuid;
begin
  if ref is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and ref is not distinct from (to_jsonb(old) ->> col)::uuid then
    return new;
  end if;
  if not exists (select 1 from public.members m where m.workspace_id = new.workspace_id and m.user_id = ref) then
    raise exception 'not_a_member' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.check_member_ref() from public;

create trigger tasks_check_assignee before insert or update of assignee_id on public.tasks
  for each row execute function private.check_member_ref('assignee_id');
create trigger projects_check_owner before insert or update of owner_id on public.projects
  for each row execute function private.check_member_ref('owner_id');
create trigger deals_check_owner before insert or update of owner_id on public.deals
  for each row execute function private.check_member_ref('owner_id');
create trigger companies_check_owner before insert or update of owner_id on public.companies
  for each row execute function private.check_member_ref('owner_id');
create trigger contacts_check_owner before insert or update of owner_id on public.contacts
  for each row execute function private.check_member_ref('owner_id');

-- E-mail notifications opt-out --------------------------------------------------
alter table public.profiles add column notify_email boolean not null default true;
grant update (notify_email) on public.profiles to authenticated;
