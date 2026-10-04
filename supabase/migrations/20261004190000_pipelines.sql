-- Several sales pipelines per company (e.g. new customers, renewals, partners).
-- Every pipeline has its own stages, including its own "won" and "lost". A deal's pipeline is the
-- pipeline of its stage. Existing companies get one pipeline holding their current stages.

create table public.pipelines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, workspace_id)
);
create index pipelines_workspace_idx on public.pipelines (workspace_id, position);
alter table public.pipelines enable row level security;
create policy pipelines_select on public.pipelines for select to authenticated using (private.is_member(workspace_id));
create policy pipelines_manage on public.pipelines for all to authenticated
  using (private.has_role(workspace_id, array['owner','admin']::public.member_role[]))
  with check (private.has_role(workspace_id, array['owner','admin']::public.member_role[]));
create policy pipelines_writable_ins on public.pipelines as restrictive for insert to authenticated with check (private.workspace_writable(workspace_id));
create policy pipelines_writable_upd on public.pipelines as restrictive for update to authenticated using (private.workspace_writable(workspace_id));
grant select, insert, update, delete on public.pipelines to authenticated;

alter table public.pipeline_stages add column if not exists pipeline_id uuid;

-- One pipeline for every company that has stages, named after the language of its stages.
insert into public.pipelines (workspace_id, name, position)
select s.workspace_id,
       case when bool_or(s.name in ('New lead', 'Contacted', 'Quote sent', 'Negotiation', 'Won', 'Lost')) then 'Sales' else 'Salg' end,
       0
  from public.pipeline_stages s
 group by s.workspace_id;
update public.pipeline_stages s set pipeline_id = p.id from public.pipelines p where p.workspace_id = s.workspace_id and s.pipeline_id is null;

alter table public.pipeline_stages alter column pipeline_id set not null;
alter table public.pipeline_stages
  add constraint pipeline_stages_pipeline_fkey foreign key (pipeline_id, workspace_id)
  references public.pipelines (id, workspace_id) on delete cascade;
create index pipeline_stages_pipeline_idx on public.pipeline_stages (pipeline_id, position);

-- A stage added without a pipeline (seeding of new companies, older code) goes into the company's
-- first pipeline, which is created when missing.
create or replace function private.stage_default_pipeline() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.pipeline_id is null then
    select id into new.pipeline_id from public.pipelines where workspace_id = new.workspace_id order by position, created_at limit 1;
    if new.pipeline_id is null then
      insert into public.pipelines (workspace_id, name, position)
      values (new.workspace_id, case when new.name in ('New lead', 'Won', 'Lost') then 'Sales' else 'Salg' end, 0)
      returning id into new.pipeline_id;
    end if;
  end if;
  return new;
end; $$;
create trigger pipeline_stages_default_pipeline before insert on public.pipeline_stages
  for each row execute function private.stage_default_pipeline();

-- Web forms put new deals in the first open stage of the first pipeline.
do $$
declare def text;
begin
  def := pg_get_functiondef('public.lead_submit(text, jsonb, text)'::regprocedure);
  def := replace(def,
    'select id into v_stage from public.pipeline_stages where workspace_id = w.id and not is_won and not is_lost order by position limit 1;',
    'select s.id into v_stage from public.pipeline_stages s join public.pipelines p on p.id = s.pipeline_id where s.workspace_id = w.id and not s.is_won and not s.is_lost order by p.position, p.created_at, s.position limit 1;');
  execute def;
end $$;
