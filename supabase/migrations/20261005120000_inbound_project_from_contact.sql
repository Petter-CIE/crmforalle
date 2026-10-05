-- E-mail that arrives without a project (the BCC address, a mailbox without a project) is tagged
-- with the project of the contact it links to – when that contact is in exactly one project.
-- A company matched by domain uses the company's single project the same way. With several (or no)
-- projects the e-mail stays without a project, as before.

-- The only project of a contact / company, or null.
create or replace function private.single_project_of_contact(kid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select case when count(*) = 1 then min(pk.project_id::text)::uuid end
    from public.project_contacts pk join public.projects p on p.id = pk.project_id and not p.archived
   where pk.contact_id = kid;
$$;

create or replace function private.single_project_of_company(cid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select case when count(*) = 1 then min(pc.project_id::text)::uuid end
    from public.project_companies pc join public.projects p on p.id = pc.project_id and not p.archived
   where pc.company_id = cid;
$$;

revoke all on function private.single_project_of_contact(uuid), private.single_project_of_company(uuid) from public, anon, authenticated;

create or replace function private.link_inbound(p_id uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  e public.inbound_emails;
  v_body text;
  v_count integer := 0;
  v_project uuid;
  v_projects uuid[] := '{}';
  r record;
begin
  select * into e from public.inbound_emails where id = p_id for update;
  if not found or e.status <> 'unmatched' then return 0; end if;

  v_body := left(
    coalesce(nullif(e.subject, ''), '(—)') || chr(10)
    || 'Fra: ' || coalesce(e.from_name || ' <' || e.from_email || '>', e.from_email) || chr(10)
    || 'Til: ' || array_to_string(e.to_emails || e.cc_emails, ', ') || chr(10) || chr(10)
    || coalesce(e.body, ''), 4000);

  for r in
    select distinct c.id, c.company_id from public.contacts c
    where c.workspace_id = e.workspace_id and lower(c.email) = any (e.external_emails)
  loop
    v_project := coalesce(e.project_id, private.single_project_of_contact(r.id));
    insert into public.activities (workspace_id, type, body, contact_id, company_id, author_id, occurred_at, project_id)
    values (e.workspace_id, 'email', v_body, r.id, r.company_id, e.author_id, e.sent_at, v_project);
    if e.project_id is not null then
      insert into public.project_contacts (workspace_id, project_id, contact_id) values (e.workspace_id, e.project_id, r.id) on conflict do nothing;
    end if;
    if v_project is not null then v_projects := array_append(v_projects, v_project); end if;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    for r in
      select distinct co.id from public.companies co, unnest(e.external_emails) a
      where co.workspace_id = e.workspace_id
        and not private.is_free_mail_domain(split_part(a, '@', 2))
        and (lower(split_part(co.email, '@', 2)) = split_part(a, '@', 2)
             or private.host_of(co.website) = split_part(a, '@', 2))
    loop
      v_project := coalesce(e.project_id, private.single_project_of_company(r.id));
      insert into public.activities (workspace_id, type, body, company_id, author_id, occurred_at, project_id)
      values (e.workspace_id, 'email', v_body, r.id, e.author_id, e.sent_at, v_project);
      if v_project is not null then v_projects := array_append(v_projects, v_project); end if;
      v_count := v_count + 1;
    end loop;
  end if;

  if v_count > 0 then
    -- The stored e-mail gets the project too when every link agreed on one.
    update public.inbound_emails
       set status = 'linked',
           linked_count = v_count,
           project_id = coalesce(project_id,
                                 case when cardinality(v_projects) = v_count
                                       and (select count(distinct x) from unnest(v_projects) x) = 1
                                      then v_projects[1] end)
     where id = p_id;
  end if;
  return v_count;
end; $function$;

-- Earlier e-mails on the timeline: tag them the same way.
update public.activities a
   set project_id = private.single_project_of_contact(a.contact_id)
 where a.type = 'email' and a.project_id is null and a.contact_id is not null
   and private.single_project_of_contact(a.contact_id) is not null;
update public.activities a
   set project_id = private.single_project_of_company(a.company_id)
 where a.type = 'email' and a.project_id is null and a.contact_id is null and a.company_id is not null
   and private.single_project_of_company(a.company_id) is not null;
