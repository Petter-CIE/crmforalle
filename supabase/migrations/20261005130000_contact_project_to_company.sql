-- A contact's projects carry over to its company: adding a contact to a project (from the contact
-- form, the project page, bulk actions or a project mailbox) also adds its company, and linking a
-- contact that already has projects to a company adds that company to them. Only ever adds –
-- removing a contact from a project leaves the company, other contacts may still need it there.

create or replace function private.contact_project_to_company() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'project_contacts' then
    insert into public.project_companies (workspace_id, project_id, company_id)
    select new.workspace_id, new.project_id, c.company_id
      from public.contacts c
     where c.id = new.contact_id and c.company_id is not null
    on conflict do nothing;
  elsif new.company_id is not null and new.company_id is distinct from old.company_id then
    insert into public.project_companies (workspace_id, project_id, company_id)
    select new.workspace_id, pk.project_id, new.company_id
      from public.project_contacts pk
     where pk.contact_id = new.id
    on conflict do nothing;
  end if;
  return null;
end; $$;
revoke all on function private.contact_project_to_company() from public, anon, authenticated;

drop trigger if exists project_contacts_to_company on public.project_contacts;
create trigger project_contacts_to_company after insert on public.project_contacts
  for each row execute function private.contact_project_to_company();

drop trigger if exists contacts_company_projects on public.contacts;
create trigger contacts_company_projects after update of company_id on public.contacts
  for each row execute function private.contact_project_to_company();

-- Existing contacts: put their companies in the same projects.
insert into public.project_companies (workspace_id, project_id, company_id)
select distinct pk.workspace_id, pk.project_id, c.company_id
  from public.project_contacts pk
  join public.contacts c on c.id = pk.contact_id
 where c.company_id is not null
on conflict do nothing;
