-- Task details: description, "in progress" state, comments and file attachments.

alter table public.tasks
  add column description text check (char_length(description) <= 20000),
  add column started_at timestamptz;
alter table public.tasks add constraint tasks_id_workspace_key unique (id, workspace_id);

-- Comments / notes on a task ------------------------------------------------------
create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now(),
  foreign key (task_id, workspace_id) references public.tasks(id, workspace_id) on delete cascade
);
create index task_comments_task_idx on public.task_comments(task_id, created_at);
create index task_comments_workspace_idx on public.task_comments(workspace_id);
create index task_comments_author_idx on public.task_comments(author_id);

alter table public.task_comments enable row level security;
create policy task_comments_select on public.task_comments for select to authenticated
  using (private.is_member(workspace_id));
create policy task_comments_insert on public.task_comments for insert to authenticated
  with check (private.is_member(workspace_id) and author_id = (select auth.uid()));
create policy task_comments_delete on public.task_comments for delete to authenticated
  using (author_id = (select auth.uid()) and private.is_member(workspace_id));

-- Attachments (files live in the private "attachments" storage bucket) -----------
create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null,
  path text not null unique,
  name text not null check (char_length(name) between 1 and 255),
  size bigint not null default 0,
  mime text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (task_id, workspace_id) references public.tasks(id, workspace_id) on delete cascade,
  -- object path must sit in the workspace's own folder
  check (split_part(path, '/', 1) = workspace_id::text)
);
create index task_attachments_task_idx on public.task_attachments(task_id, created_at);
create index task_attachments_workspace_idx on public.task_attachments(workspace_id);
create index task_attachments_uploaded_by_idx on public.task_attachments(uploaded_by);

alter table public.task_attachments enable row level security;
create policy task_attachments_select on public.task_attachments for select to authenticated
  using (private.is_member(workspace_id));
create policy task_attachments_insert on public.task_attachments for insert to authenticated
  with check (private.is_member(workspace_id) and uploaded_by = (select auth.uid()));
create policy task_attachments_delete on public.task_attachments for delete to authenticated
  using (private.is_member(workspace_id));

-- Storage bucket: private, 25 MB per file. Object names start with the workspace id.
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 26214400)
on conflict (id) do nothing;

-- Folder name -> membership check that never fails on non-uuid names.
create or replace function private.is_member_folder(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.is_member(split_part(p_name, '/', 1)::uuid)
    else false
  end;
$$;
revoke all on function private.is_member_folder(text) from public;
grant execute on function private.is_member_folder(text) to authenticated;

create policy attachments_select on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and private.is_member_folder(name));
create policy attachments_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and private.is_member_folder(name));
create policy attachments_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and private.is_member_folder(name));
