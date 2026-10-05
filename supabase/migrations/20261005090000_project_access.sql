-- Project-limited users.
-- A member with the role "user" can be limited to chosen projects. Without any project chosen they see the
-- whole company, exactly as before. Owners and admins always see everything.
--
-- How it works:
-- * members.restricted marks a limited user; project_members lists the projects they may see.
--   (A separate flag, so deleting a limited user's last project never opens up the whole company.)
-- * Invitations can carry project_ids; accepting such an invitation makes the new member limited.
-- * RESTRICTIVE policies on the CRM tables hide everything outside the user's projects. They are added
--   next to the existing policies and leave unlimited members unaffected.
--
-- What a limited user sees:
--   projects            the projects they are added to
--   companies/contacts  linked to one of their projects (directly, through a contact or company in the
--                       project, or through a deal in the project) – plus what they created or own
--   deals               in one of their projects – plus their own
--   tasks               in one of their projects – plus tasks assigned to them, created by them or shared with them
--   activities          tagged with one of their projects; untagged ones on a company/contact/deal they see;
--                       plus their own entries
--   quotes              on a deal/company they see – plus their own
--   e-mails             stored with one of their projects
--
-- Rollback: drop the *_project_scope policies (see the bottom of this file).

-- 1) Data ------------------------------------------------------------------------------------------

alter table public.members add column if not exists restricted boolean not null default false;
grant update (restricted) on public.members to authenticated;

alter table public.invitations add column if not exists project_ids uuid[] not null default '{}';

create table if not exists public.project_members (
  workspace_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id),
  foreign key (workspace_id, user_id) references public.members(workspace_id, user_id) on delete cascade
);
create index if not exists project_members_user_idx on public.project_members (user_id, workspace_id);
create index if not exists project_members_workspace_idx on public.project_members (workspace_id);

alter table public.project_members enable row level security;
grant select, insert, delete on public.project_members to authenticated;

drop policy if exists project_members_select on public.project_members;
create policy project_members_select on public.project_members for select to authenticated
  using (private.is_member(workspace_id));

drop policy if exists project_members_manage on public.project_members;
create policy project_members_manage on public.project_members for all to authenticated
  using (private.has_role(workspace_id, array['owner', 'admin']::public.member_role[]))
  with check (
    private.has_role(workspace_id, array['owner', 'admin']::public.member_role[])
    and exists (select 1 from public.projects p where p.id = project_id and p.workspace_id = project_members.workspace_id)
  );

-- Keep project_members.workspace_id honest for writes that bypass RLS too.
create or replace function private.check_project_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.projects p where p.id = new.project_id and p.workspace_id = new.workspace_id) then
    raise exception 'project_not_in_workspace' using errcode = '23514';
  end if;
  return new;
end; $$;
drop trigger if exists project_members_check on public.project_members;
create trigger project_members_check before insert or update on public.project_members
  for each row execute function private.check_project_member();

-- 2) Helpers (security definer: they read the link tables regardless of the caller's own visibility) --

-- True when the current user is a limited member of the company.
create or replace function private.is_restricted(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members m
     where m.workspace_id = ws and m.user_id = (select auth.uid()) and m.restricted and m.role = 'user'
  );
$$;

-- The current user is added to this project.
create or replace function private.project_ok(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select pid is not null and exists (
    select 1 from public.project_members pm where pm.project_id = pid and pm.user_id = (select auth.uid())
  );
$$;

create or replace function private.company_ok(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select cid is not null and (
    exists (select 1 from public.project_companies pc
              join public.project_members pm on pm.project_id = pc.project_id and pm.user_id = (select auth.uid())
             where pc.company_id = cid)
    or exists (select 1 from public.contacts c
                 join public.project_contacts pk on pk.contact_id = c.id
                 join public.project_members pm on pm.project_id = pk.project_id and pm.user_id = (select auth.uid())
                where c.company_id = cid)
    or exists (select 1 from public.deals d
                 join public.project_members pm on pm.project_id = d.project_id and pm.user_id = (select auth.uid())
                where d.company_id = cid)
  );
$$;

create or replace function private.contact_ok(kid uuid, cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select kid is not null and (
    exists (select 1 from public.project_contacts pk
              join public.project_members pm on pm.project_id = pk.project_id and pm.user_id = (select auth.uid())
             where pk.contact_id = kid)
    or exists (select 1 from public.deals d
                 join public.project_members pm on pm.project_id = d.project_id and pm.user_id = (select auth.uid())
                where d.contact_id = kid)
    or (cid is not null and exists (select 1 from public.project_companies pc
                                      join public.project_members pm on pm.project_id = pc.project_id and pm.user_id = (select auth.uid())
                                     where pc.company_id = cid))
  );
$$;

create or replace function private.contact_id_ok(kid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.contacts c
     where c.id = kid
       and (c.created_by = (select auth.uid()) or c.owner_id = (select auth.uid()) or private.contact_ok(c.id, c.company_id))
  );
$$;

create or replace function private.company_id_ok(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.companies c
     where c.id = cid
       and (c.created_by = (select auth.uid()) or c.owner_id = (select auth.uid()) or private.company_ok(c.id))
  );
$$;

create or replace function private.deal_id_ok(did uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.deals d
     where d.id = did
       and (d.created_by = (select auth.uid()) or d.owner_id = (select auth.uid()) or private.project_ok(d.project_id))
  );
$$;

create or replace function private.task_id_ok(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tasks t
     where t.id = tid
       and (t.assignee_id = (select auth.uid()) or t.created_by = (select auth.uid())
            or private.project_ok(t.project_id)
            or exists (select 1 from public.task_members tm where tm.task_id = t.id and tm.user_id = (select auth.uid())))
  );
$$;

create or replace function private.quote_id_ok(qid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.quotes q
     where q.id = qid
       and (q.created_by = (select auth.uid()) or private.deal_id_ok(q.deal_id) or private.company_id_ok(q.company_id))
  );
$$;

revoke all on function private.is_restricted(uuid), private.project_ok(uuid), private.company_ok(uuid),
  private.contact_ok(uuid, uuid), private.contact_id_ok(uuid), private.company_id_ok(uuid),
  private.deal_id_ok(uuid), private.task_id_ok(uuid), private.quote_id_ok(uuid) from public, anon;
grant execute on function private.is_restricted(uuid), private.project_ok(uuid), private.company_ok(uuid),
  private.contact_ok(uuid, uuid), private.contact_id_ok(uuid), private.company_id_ok(uuid),
  private.deal_id_ok(uuid), private.task_id_ok(uuid), private.quote_id_ok(uuid) to authenticated;

-- 3) Restrictive policies --------------------------------------------------------------------------
-- Each one is "unlimited member, or the row is inside the user's projects". They are ANDed with the
-- existing member policies, which stay as they are.

drop policy if exists projects_project_scope on public.projects;
create policy projects_project_scope on public.projects as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id) or private.project_ok(id))
  with check (not private.is_restricted(workspace_id) or private.project_ok(id));

drop policy if exists project_companies_project_scope on public.project_companies;
create policy project_companies_project_scope on public.project_companies as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id) or private.project_ok(project_id))
  with check (not private.is_restricted(workspace_id) or private.project_ok(project_id));

drop policy if exists project_contacts_project_scope on public.project_contacts;
create policy project_contacts_project_scope on public.project_contacts as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id) or private.project_ok(project_id))
  with check (not private.is_restricted(workspace_id) or private.project_ok(project_id));

drop policy if exists companies_project_scope on public.companies;
create policy companies_project_scope on public.companies as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id)
         or created_by = (select auth.uid()) or owner_id = (select auth.uid()) or private.company_ok(id))
  with check (not private.is_restricted(workspace_id)
              or created_by = (select auth.uid()) or owner_id = (select auth.uid()) or private.company_ok(id));

drop policy if exists contacts_project_scope on public.contacts;
create policy contacts_project_scope on public.contacts as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id)
         or created_by = (select auth.uid()) or owner_id = (select auth.uid()) or private.contact_ok(id, company_id))
  with check (not private.is_restricted(workspace_id)
              or created_by = (select auth.uid()) or owner_id = (select auth.uid()) or private.contact_ok(id, company_id));

drop policy if exists deals_project_scope on public.deals;
create policy deals_project_scope on public.deals as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id)
         or created_by = (select auth.uid()) or owner_id = (select auth.uid()) or private.project_ok(project_id))
  with check (not private.is_restricted(workspace_id)
              or created_by = (select auth.uid()) or owner_id = (select auth.uid()) or private.project_ok(project_id));

drop policy if exists tasks_project_scope on public.tasks;
create policy tasks_project_scope on public.tasks as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id)
         or assignee_id = (select auth.uid()) or created_by = (select auth.uid()) or private.project_ok(project_id)
         or exists (select 1 from public.task_members tm where tm.task_id = tasks.id and tm.user_id = (select auth.uid())))
  with check (not private.is_restricted(workspace_id)
              or assignee_id = (select auth.uid()) or created_by = (select auth.uid()) or private.project_ok(project_id));

drop policy if exists task_members_project_scope on public.task_members;
create policy task_members_project_scope on public.task_members as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id) or user_id = (select auth.uid()) or private.task_id_ok(task_id))
  with check (not private.is_restricted(workspace_id) or private.task_id_ok(task_id));

drop policy if exists task_comments_project_scope on public.task_comments;
create policy task_comments_project_scope on public.task_comments as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id) or private.task_id_ok(task_id))
  with check (not private.is_restricted(workspace_id) or private.task_id_ok(task_id));

drop policy if exists task_attachments_project_scope on public.task_attachments;
create policy task_attachments_project_scope on public.task_attachments as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id) or private.task_id_ok(task_id))
  with check (not private.is_restricted(workspace_id) or private.task_id_ok(task_id));

drop policy if exists activities_project_scope on public.activities;
create policy activities_project_scope on public.activities as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id)
         or author_id = (select auth.uid())
         or private.project_ok(project_id)
         or (project_id is null and (private.company_id_ok(company_id) or private.contact_id_ok(contact_id) or private.deal_id_ok(deal_id))))
  with check (not private.is_restricted(workspace_id) or author_id = (select auth.uid()));

drop policy if exists quotes_project_scope on public.quotes;
create policy quotes_project_scope on public.quotes as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id)
         or created_by = (select auth.uid()) or private.deal_id_ok(deal_id) or private.company_id_ok(company_id))
  with check (not private.is_restricted(workspace_id)
              or created_by = (select auth.uid()) or private.deal_id_ok(deal_id) or private.company_id_ok(company_id));

drop policy if exists quote_lines_project_scope on public.quote_lines;
create policy quote_lines_project_scope on public.quote_lines as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id) or private.quote_id_ok(quote_id))
  with check (not private.is_restricted(workspace_id) or private.quote_id_ok(quote_id));

drop policy if exists external_invoices_project_scope on public.external_invoices;
create policy external_invoices_project_scope on public.external_invoices as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id) or private.company_id_ok(company_id))
  with check (not private.is_restricted(workspace_id) or private.company_id_ok(company_id));

drop policy if exists inbound_emails_project_scope on public.inbound_emails;
create policy inbound_emails_project_scope on public.inbound_emails as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id) or private.project_ok(project_id));

drop policy if exists bookings_project_scope on public.bookings;
create policy bookings_project_scope on public.bookings as restrictive for all to authenticated
  using (not private.is_restricted(workspace_id) or user_id = (select auth.uid()));

-- Limited users don't create or change projects themselves.
-- (Covered by projects_project_scope: a new project has no project_members row for them.)

-- 4) Invitations carry the projects ---------------------------------------------------------------

create or replace function public.accept_invitation(p_token uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_inv public.invitations%rowtype;
  v_new boolean;
  v_projects uuid[];
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select email into v_email from auth.users where id = v_uid;
  select * into v_inv from public.invitations
    where token = p_token and accepted_at is null and expires_at > now()
    for update;
  if not found then raise exception 'invitation not found or expired'; end if;
  if lower(v_inv.email) <> lower(v_email) then raise exception 'invitation is for another email'; end if;

  insert into public.members (workspace_id, user_id, role)
    values (v_inv.workspace_id, v_uid, v_inv.role)
    on conflict (workspace_id, user_id) do nothing
  returning true into v_new;

  -- Only a brand-new member is limited by the invitation; an existing membership is left as it is.
  if coalesce(v_new, false) and v_inv.role = 'user' and cardinality(v_inv.project_ids) > 0 then
    select coalesce(array_agg(p.id), '{}') into v_projects
      from public.projects p where p.workspace_id = v_inv.workspace_id and p.id = any (v_inv.project_ids);
    update public.members set restricted = true where workspace_id = v_inv.workspace_id and user_id = v_uid;
    insert into public.project_members (workspace_id, project_id, user_id, added_by)
      select v_inv.workspace_id, pid, v_uid, v_inv.invited_by from unnest(v_projects) pid
      on conflict do nothing;
  end if;

  update public.invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.workspace_id;
end;
$$;
revoke all on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.accept_invitation(uuid) to authenticated;

-- Rollback (if ever needed):
--   drop policy projects_project_scope on public.projects;  … and the other *_project_scope policies.
