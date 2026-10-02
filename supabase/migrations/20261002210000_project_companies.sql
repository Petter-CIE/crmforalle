-- Companies can belong to projects, like contacts.
create table public.project_companies (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null,
  company_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (project_id, company_id),
  foreign key (project_id, workspace_id) references public.projects(id, workspace_id) on delete cascade,
  foreign key (company_id, workspace_id) references public.companies(id, workspace_id) on delete cascade
);
create index project_companies_company_ws_idx on public.project_companies(company_id, workspace_id);
create index project_companies_workspace_idx on public.project_companies(workspace_id);

alter table public.project_companies enable row level security;
create policy project_companies_member on public.project_companies for all to authenticated
  using (private.is_member(workspace_id)) with check (private.is_member(workspace_id));

grant select, insert, update, delete on public.project_companies to authenticated;
