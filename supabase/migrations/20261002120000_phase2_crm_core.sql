-- Phase 2: CRM core – companies, contacts, projects, pipeline, deals, tasks, activities.
-- Every table carries workspace_id; RLS = member of that workspace.
-- Cross-table links use composite foreign keys (id, workspace_id) so a row can
-- never point at data in another workspace.

-- updated_at helper
create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Companies (customers) -------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  org_number text check (org_number ~ '^[0-9]{9}$'),
  address text,
  postal_code text,
  city text,
  nace_code text,
  nace_description text,
  website text,
  email text,
  phone text,
  notes text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);
create index companies_workspace_idx on public.companies(workspace_id, name);
create unique index companies_org_unique on public.companies(workspace_id, org_number) where org_number is not null;
create index companies_owner_idx on public.companies(owner_id);
create index companies_created_by_idx on public.companies(created_by);

-- Contacts ----------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid,
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text check (char_length(last_name) <= 100),
  email text,
  phone text,
  title text,
  notes text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (company_id, workspace_id) references public.companies(id, workspace_id) on delete set null (company_id)
);
create index contacts_workspace_idx on public.contacts(workspace_id, first_name, last_name);
create index contacts_company_idx on public.contacts(company_id);
create index contacts_owner_idx on public.contacts(owner_id);
create index contacts_created_by_idx on public.contacts(created_by);

-- Projects (group contacts and deals) ------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  color text not null default 'green' check (color in ('green','blue','amber','red','purple','gray')),
  archived boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);
create index projects_workspace_idx on public.projects(workspace_id, archived, name);
create index projects_created_by_idx on public.projects(created_by);

create table public.project_contacts (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null,
  contact_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (project_id, contact_id),
  foreign key (project_id, workspace_id) references public.projects(id, workspace_id) on delete cascade,
  foreign key (contact_id, workspace_id) references public.contacts(id, workspace_id) on delete cascade
);
create index project_contacts_contact_idx on public.project_contacts(contact_id);
create index project_contacts_workspace_idx on public.project_contacts(workspace_id);

-- Pipeline stages -------------------------------------------------------------
create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position integer not null default 0,
  probability integer not null default 0 check (probability between 0 and 100),
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  check (not (is_won and is_lost))
);
create index pipeline_stages_workspace_idx on public.pipeline_stages(workspace_id, position);

-- Deals -------------------------------------------------------------------------
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  value numeric(14,2) not null default 0 check (value >= 0),
  currency text not null default 'NOK',
  stage_id uuid not null,
  company_id uuid,
  contact_id uuid,
  project_id uuid,
  owner_id uuid references public.profiles(id) on delete set null,
  expected_close date,
  closed_at timestamptz,
  lost_reason text,
  position double precision not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (stage_id, workspace_id) references public.pipeline_stages(id, workspace_id),
  foreign key (company_id, workspace_id) references public.companies(id, workspace_id) on delete set null (company_id),
  foreign key (contact_id, workspace_id) references public.contacts(id, workspace_id) on delete set null (contact_id),
  foreign key (project_id, workspace_id) references public.projects(id, workspace_id) on delete set null (project_id)
);
create index deals_workspace_stage_idx on public.deals(workspace_id, stage_id, position);
create index deals_company_idx on public.deals(company_id);
create index deals_contact_idx on public.deals(contact_id);
create index deals_project_idx on public.deals(project_id);
create index deals_owner_idx on public.deals(owner_id);
create index deals_created_by_idx on public.deals(created_by);
create index deals_stage_idx on public.deals(stage_id);

-- Tasks -------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  due_at timestamptz,
  done_at timestamptz,
  assignee_id uuid references public.profiles(id) on delete set null,
  company_id uuid,
  contact_id uuid,
  deal_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (company_id, workspace_id) references public.companies(id, workspace_id) on delete cascade,
  foreign key (contact_id, workspace_id) references public.contacts(id, workspace_id) on delete cascade,
  foreign key (deal_id, workspace_id) references public.deals(id, workspace_id) on delete cascade
);
create index tasks_workspace_open_idx on public.tasks(workspace_id, done_at, due_at);
create index tasks_assignee_idx on public.tasks(assignee_id);
create index tasks_company_idx on public.tasks(company_id);
create index tasks_contact_idx on public.tasks(contact_id);
create index tasks_deal_idx on public.tasks(deal_id);
create index tasks_created_by_idx on public.tasks(created_by);

-- Activities (timeline: notes, stage changes, created, won/lost) -----------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null check (type in ('note','call','meeting','email','stage_change','won','lost','created')),
  body text,
  company_id uuid,
  contact_id uuid,
  deal_id uuid,
  author_id uuid references public.profiles(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (company_id, workspace_id) references public.companies(id, workspace_id) on delete cascade,
  foreign key (contact_id, workspace_id) references public.contacts(id, workspace_id) on delete cascade,
  foreign key (deal_id, workspace_id) references public.deals(id, workspace_id) on delete cascade
);
create index activities_company_idx on public.activities(company_id, occurred_at desc);
create index activities_contact_idx on public.activities(contact_id, occurred_at desc);
create index activities_deal_idx on public.activities(deal_id, occurred_at desc);
create index activities_workspace_idx on public.activities(workspace_id, occurred_at desc);
create index activities_author_idx on public.activities(author_id);

-- updated_at triggers
create trigger companies_touch before update on public.companies for each row execute function private.touch_updated_at();
create trigger contacts_touch before update on public.contacts for each row execute function private.touch_updated_at();
create trigger projects_touch before update on public.projects for each row execute function private.touch_updated_at();
create trigger deals_touch before update on public.deals for each row execute function private.touch_updated_at();
create trigger tasks_touch before update on public.tasks for each row execute function private.touch_updated_at();

-- Plan limit: companies + contacts per workspace ---------------------------------
create or replace function private.enforce_contact_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
  v_count integer;
begin
  select contact_limit into v_limit from public.workspaces where id = new.workspace_id;
  select (select count(*) from public.companies where workspace_id = new.workspace_id)
       + (select count(*) from public.contacts where workspace_id = new.workspace_id)
    into v_count;
  if v_count >= v_limit then
    raise exception 'contact_limit_reached' using errcode = 'P0001', hint = v_limit::text;
  end if;
  return new;
end;
$$;
create trigger companies_limit before insert on public.companies for each row execute function private.enforce_contact_limit();
create trigger contacts_limit before insert on public.contacts for each row execute function private.enforce_contact_limit();

-- Deal timeline: log stage changes, won/lost, and set closed_at -------------------
create or replace function private.deal_stage_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_stage public.pipeline_stages%rowtype;
begin
  if tg_op = 'UPDATE' and new.stage_id is not distinct from old.stage_id then
    return new;
  end if;
  select * into v_stage from public.pipeline_stages where id = new.stage_id;
  if v_stage.is_won or v_stage.is_lost then
    new.closed_at := coalesce(new.closed_at, now());
  else
    new.closed_at := null;
    new.lost_reason := null;
  end if;
  return new;
end;
$$;
create trigger deals_stage_before before insert or update of stage_id on public.deals
  for each row execute function private.deal_stage_changed();

create or replace function private.deal_stage_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_stage public.pipeline_stages%rowtype;
begin
  select * into v_stage from public.pipeline_stages where id = new.stage_id;
  insert into public.activities (workspace_id, type, body, deal_id, company_id, contact_id, author_id)
  values (
    new.workspace_id,
    case when tg_op = 'INSERT' then 'created' when v_stage.is_won then 'won' when v_stage.is_lost then 'lost' else 'stage_change' end,
    v_stage.name,
    new.id, new.company_id, new.contact_id,
    (select auth.uid())
  );
  return null;
end;
$$;
create trigger deals_stage_after_insert after insert on public.deals
  for each row execute function private.deal_stage_log();
create trigger deals_stage_after_update after update of stage_id on public.deals
  for each row when (old.stage_id is distinct from new.stage_id) execute function private.deal_stage_log();

-- Default pipeline for new workspaces ---------------------------------------------
create or replace function private.seed_pipeline(p_workspace uuid, p_locale text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.pipeline_stages where workspace_id = p_workspace) then return; end if;
  if p_locale = 'en' then
    insert into public.pipeline_stages (workspace_id, name, position, probability, is_won, is_lost) values
      (p_workspace, 'New lead', 0, 10, false, false),
      (p_workspace, 'Contacted', 1, 25, false, false),
      (p_workspace, 'Quote sent', 2, 50, false, false),
      (p_workspace, 'Negotiation', 3, 75, false, false),
      (p_workspace, 'Won', 4, 100, true, false),
      (p_workspace, 'Lost', 5, 0, false, true);
  else
    insert into public.pipeline_stages (workspace_id, name, position, probability, is_won, is_lost) values
      (p_workspace, 'Ny henvendelse', 0, 10, false, false),
      (p_workspace, 'Kontaktet', 1, 25, false, false),
      (p_workspace, 'Tilbud sendt', 2, 50, false, false),
      (p_workspace, 'Forhandling', 3, 75, false, false),
      (p_workspace, 'Vunnet', 4, 100, true, false),
      (p_workspace, 'Tapt', 5, 0, false, true);
  end if;
end;
$$;
revoke all on function private.seed_pipeline(uuid, text) from public, anon, authenticated;

create or replace function public.create_workspace(p_name text, p_org_number text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ws uuid;
  v_locale text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.workspaces (name, org_number, created_by)
  values (trim(p_name), nullif(regexp_replace(coalesce(p_org_number, ''), '\s', '', 'g'), ''), v_uid)
  returning id into v_ws;
  insert into public.members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  select locale into v_locale from public.profiles where id = v_uid;
  perform private.seed_pipeline(v_ws, coalesce(v_locale, 'nb'));
  return v_ws;
end;
$$;

-- Seed existing workspaces
select private.seed_pipeline(w.id, coalesce(p.locale, 'nb'))
from public.workspaces w left join public.profiles p on p.id = w.created_by;

-- Row level security ---------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.projects enable row level security;
alter table public.project_contacts enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.deals enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;

create policy companies_member on public.companies for all to authenticated
  using (private.is_member(workspace_id)) with check (private.is_member(workspace_id));
create policy contacts_member on public.contacts for all to authenticated
  using (private.is_member(workspace_id)) with check (private.is_member(workspace_id));
create policy projects_member on public.projects for all to authenticated
  using (private.is_member(workspace_id)) with check (private.is_member(workspace_id));
create policy project_contacts_member on public.project_contacts for all to authenticated
  using (private.is_member(workspace_id)) with check (private.is_member(workspace_id));
create policy deals_member on public.deals for all to authenticated
  using (private.is_member(workspace_id)) with check (private.is_member(workspace_id));
create policy tasks_member on public.tasks for all to authenticated
  using (private.is_member(workspace_id)) with check (private.is_member(workspace_id));

-- Stages: everyone reads; only owner/admin change them
create policy stages_select on public.pipeline_stages for select to authenticated
  using (private.is_member(workspace_id));
create policy stages_manage on public.pipeline_stages for all to authenticated
  using (private.has_role(workspace_id, array['owner','admin']::public.member_role[]))
  with check (private.has_role(workspace_id, array['owner','admin']::public.member_role[]));

-- Activities: members read and add; only the author edits/deletes own notes
create policy activities_select on public.activities for select to authenticated
  using (private.is_member(workspace_id));
create policy activities_insert on public.activities for insert to authenticated
  with check (private.is_member(workspace_id) and author_id = (select auth.uid()) and type in ('note','call','meeting','email'));
create policy activities_update on public.activities for update to authenticated
  using (author_id = (select auth.uid()) and private.is_member(workspace_id))
  with check (author_id = (select auth.uid()) and type in ('note','call','meeting','email'));
create policy activities_delete on public.activities for delete to authenticated
  using (author_id = (select auth.uid()) and private.is_member(workspace_id));
