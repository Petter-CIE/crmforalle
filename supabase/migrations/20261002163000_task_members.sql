-- Several people can work on one task: collaborators in addition to the assignee.
create table public.task_members (
  task_id uuid not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id),
  foreign key (task_id, workspace_id) references public.tasks(id, workspace_id) on delete cascade
);
create index task_members_user_idx on public.task_members(user_id, workspace_id);
create index task_members_workspace_idx on public.task_members(workspace_id);
create index task_members_added_by_idx on public.task_members(added_by);

alter table public.task_members enable row level security;
create policy task_members_member on public.task_members for all to authenticated
  using (private.is_member(workspace_id)) with check (private.is_member(workspace_id));

create trigger task_members_check_user before insert or update of user_id on public.task_members
  for each row execute function private.check_member_ref('user_id');
