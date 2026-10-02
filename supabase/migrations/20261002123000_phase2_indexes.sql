-- Covering indexes for composite (x_id, workspace_id) foreign keys.
create index if not exists activities_company_ws_idx on public.activities(company_id, workspace_id);
create index if not exists activities_contact_ws_idx on public.activities(contact_id, workspace_id);
create index if not exists activities_deal_ws_idx on public.activities(deal_id, workspace_id);
create index if not exists contacts_company_ws_idx on public.contacts(company_id, workspace_id);
create index if not exists deals_company_ws_idx on public.deals(company_id, workspace_id);
create index if not exists deals_contact_ws_idx on public.deals(contact_id, workspace_id);
create index if not exists deals_project_ws_idx on public.deals(project_id, workspace_id);
create index if not exists deals_stage_ws_idx on public.deals(stage_id, workspace_id);
create index if not exists project_contacts_contact_ws_idx on public.project_contacts(contact_id, workspace_id);
create index if not exists project_contacts_project_ws_idx on public.project_contacts(project_id, workspace_id);
create index if not exists tasks_company_ws_idx on public.tasks(company_id, workspace_id);
create index if not exists tasks_contact_ws_idx on public.tasks(contact_id, workspace_id);
create index if not exists tasks_deal_ws_idx on public.tasks(deal_id, workspace_id);

-- TODO (needs manual approval, destructive): replace stages_manage with separate
-- insert/update/delete policies to avoid two permissive SELECT policies.
