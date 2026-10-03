-- Accounting integrations (Tripletex first; PowerOffice/Fiken later).
-- Credentials are encrypted by the app (AES-GCM, key only in the server environment) before they are stored.

create table public.integrations (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('tripletex', 'poweroffice', 'fiken')),
  credentials text not null,
  external_company text,
  last_sync_at timestamptz,
  last_error text,
  connected_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, provider)
);
create index integrations_connected_by_idx on public.integrations(connected_by);
alter table public.integrations enable row level security;
create policy integrations_select on public.integrations for select to authenticated
  using (private.is_member(workspace_id));
create policy integrations_delete on public.integrations for delete to authenticated
  using (private.has_role(workspace_id, array['owner','admin']::public.member_role[]));
grant select, delete on public.integrations to authenticated;

-- owner/admin connects (or replaces) an integration
create or replace function public.save_integration(p_workspace uuid, p_provider text, p_credentials text, p_company text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_role(p_workspace, array['owner','admin']::public.member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.integrations (workspace_id, provider, credentials, external_company, connected_by)
  values (p_workspace, p_provider, p_credentials, left(p_company, 200), (select auth.uid()))
  on conflict (workspace_id, provider) do update
    set credentials = excluded.credentials, external_company = excluded.external_company,
        connected_by = excluded.connected_by, last_error = null;
end; $$;

-- any member's sync records its result
create or replace function public.integration_synced(p_workspace uuid, p_provider text, p_error text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_member(p_workspace) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.integrations
     set last_sync_at = case when p_error is null then now() else last_sync_at end,
         last_error = left(p_error, 500)
   where workspace_id = p_workspace and provider = p_provider;
end; $$;

revoke all on function public.save_integration(uuid, text, text, text) from public, anon;
grant execute on function public.save_integration(uuid, text, text, text) to authenticated;
revoke all on function public.integration_synced(uuid, text, text) from public, anon;
grant execute on function public.integration_synced(uuid, text, text) to authenticated;

-- which CRM record a record in the accounting system belongs to
create table public.integration_links (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  entity text not null check (entity in ('company', 'contact')),
  external_id text not null,
  local_id uuid not null,
  primary key (workspace_id, provider, entity, external_id)
);
create index integration_links_local_idx on public.integration_links(local_id);
alter table public.integration_links enable row level security;
create policy integration_links_member on public.integration_links for all to authenticated
  using (private.is_member(workspace_id)) with check (private.is_member(workspace_id));
grant select, insert, update, delete on public.integration_links to authenticated;

-- invoices read from the accounting system (last ~13 months)
create table public.external_invoices (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  external_id text not null,
  company_id uuid,
  invoice_number text,
  invoice_date date,
  due_date date,
  amount numeric(14,2) not null default 0,
  amount_ex_vat numeric(14,2) not null default 0,
  outstanding numeric(14,2) not null default 0,
  currency text not null default 'NOK',
  is_credit_note boolean not null default false,
  overdue_task_id uuid references public.tasks(id) on delete set null,
  synced_at timestamptz not null default now(),
  primary key (workspace_id, provider, external_id),
  foreign key (company_id, workspace_id) references public.companies(id, workspace_id) on delete cascade
);
create index external_invoices_company_idx on public.external_invoices(company_id, invoice_date desc);
create index external_invoices_task_idx on public.external_invoices(overdue_task_id);
alter table public.external_invoices enable row level security;
create policy external_invoices_member on public.external_invoices for all to authenticated
  using (private.is_member(workspace_id)) with check (private.is_member(workspace_id));
grant select, insert, update, delete on public.external_invoices to authenticated;

-- only one sync per company at a time (a run that crashed frees the slot after 3 minutes)
alter table public.integrations add column sync_started_at timestamptz;

create or replace function public.integration_claim_sync(p_workspace uuid, p_provider text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v boolean;
begin
  if not private.is_member(p_workspace) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.integrations set sync_started_at = now()
   where workspace_id = p_workspace and provider = p_provider
     and (sync_started_at is null or sync_started_at < now() - interval '3 minutes')
  returning true into v;
  return coalesce(v, false);
end; $$;

create or replace function public.integration_synced(p_workspace uuid, p_provider text, p_error text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_member(p_workspace) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.integrations
     set last_sync_at = case when p_error is null then now() else last_sync_at end,
         last_error = left(p_error, 500),
         sync_started_at = null
   where workspace_id = p_workspace and provider = p_provider;
end; $$;

revoke all on function public.integration_claim_sync(uuid, text) from public, anon;
grant execute on function public.integration_claim_sync(uuid, text) to authenticated;
