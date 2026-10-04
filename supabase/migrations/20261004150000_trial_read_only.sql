-- NOT APPLIED YET – to be run by the owner when decided.
-- Makes a company's data read-only (no new or changed records; deleting still works) when the
-- free trial has ended without a subscription. Matches the FAQ: "dere kan fortsatt lese og eksportere".

-- 2) Read-only when the trial is over (no plan chosen). Deleting stays possible (e.g. GDPR requests).
create or replace function private.workspace_writable(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.workspaces w where w.id = ws and w.plan = 'trial' and w.trial_ends_at < now());
$$;

do $$
declare t text;
begin
  foreach t in array array['activities','automations','companies','contacts','custom_fields','deals','email_templates','lead_forms',
    'pipeline_stages','products','project_companies','project_contacts','projects','quote_lines','quotes','saved_views',
    'task_attachments','task_comments','task_members','tasks'] loop
    execute format('create policy %I on public.%I as restrictive for insert to authenticated with check (private.workspace_writable(workspace_id))', t || '_writable_ins', t);
    execute format('create policy %I on public.%I as restrictive for update to authenticated using (private.workspace_writable(workspace_id))', t || '_writable_upd', t);
  end loop;
end $$;

