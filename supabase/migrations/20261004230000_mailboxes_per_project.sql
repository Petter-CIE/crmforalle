-- Several mailboxes per user, each optionally tied to a project (e.g. post@norgain.no → Norgain).
-- E-mail from a project mailbox is tagged with the project on the timeline, and the contacts it
-- reaches are added to the project.

-- 1) Projects on timeline entries and stored e-mails.
alter table public.activities add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.inbound_emails add column if not exists project_id uuid references public.projects(id) on delete set null;
create index if not exists activities_project_idx on public.activities (project_id) where project_id is not null;

-- 2) A user can connect several mailboxes in a company (one row per address).
alter table public.mail_connections add column if not exists project_id uuid references public.projects(id) on delete set null;
grant select (project_id), insert (project_id), update (project_id) on public.mail_connections to authenticated;
create unique index if not exists mail_connections_account_uidx on public.mail_connections (workspace_id, user_id, lower(account_email));
alter table public.mail_connections drop constraint if exists mail_connections_workspace_id_user_id_provider_key;

-- Busy times belong to the connection they came from (several calendars per user).
alter table public.calendar_busy add column if not exists connection_id uuid references public.mail_connections(id) on delete cascade;

create or replace function private.mail_connection_cleanup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and not new.calendar_enabled and old.calendar_enabled then
    delete from public.calendar_busy where connection_id = new.id;
  elsif tg_op = 'DELETE' then
    delete from public.calendar_busy where connection_id = old.id or (connection_id is null and user_id = old.user_id);
    return old;
  end if;
  return new;
end; $$;

-- 3) Linking an e-mail carries its project to the timeline entries.
do $$
declare def text;
begin
  def := pg_get_functiondef('private.link_inbound(uuid)'::regprocedure);
  def := replace(def,
    $o$insert into public.activities (workspace_id, type, body, contact_id, company_id, author_id, occurred_at)
    values (e.workspace_id, 'email', v_body, r.id, r.company_id, e.author_id, e.sent_at);$o$,
    $n$insert into public.activities (workspace_id, type, body, contact_id, company_id, author_id, occurred_at, project_id)
    values (e.workspace_id, 'email', v_body, r.id, r.company_id, e.author_id, e.sent_at, e.project_id);
    if e.project_id is not null then
      insert into public.project_contacts (workspace_id, project_id, contact_id) values (e.workspace_id, e.project_id, r.id) on conflict do nothing;
    end if;$n$);
  def := replace(def,
    $o$insert into public.activities (workspace_id, type, body, company_id, author_id, occurred_at)
      values (e.workspace_id, 'email', v_body, r.id, e.author_id, e.sent_at);$o$,
    $n$insert into public.activities (workspace_id, type, body, company_id, author_id, occurred_at, project_id)
      values (e.workspace_id, 'email', v_body, r.id, e.author_id, e.sent_at, e.project_id);$n$);
  execute def;
end $$;

-- 4) The sync stores the project of the mailbox and keeps busy times per connection.
do $$
declare def text;
begin
  def := pg_get_functiondef('public.mail_apply(text, uuid, jsonb)'::regprocedure);
  def := replace(def,
    $o$delete from public.calendar_busy where user_id = c.user_id;
    insert into public.calendar_busy (user_id, starts_at, ends_at)
    select c.user_id, (b->>0)::timestamptz, (b->>1)::timestamptz$o$,
    $n$delete from public.calendar_busy where connection_id = c.id or (connection_id is null and user_id = c.user_id);
    insert into public.calendar_busy (user_id, connection_id, starts_at, ends_at)
    select c.user_id, c.id, (b->>0)::timestamptz, (b->>1)::timestamptz$n$);
  def := replace(def,
    $o$subject, body, sent_at, author_id)
    values (c.workspace_id,$o$,
    $n$subject, body, sent_at, author_id, project_id)
    values (c.workspace_id,$n$);
  def := replace(def,
    $o$coalesce((m->>'sent_at')::timestamptz, now()), c.user_id)$o$,
    $n$coalesce((m->>'sent_at')::timestamptz, now()), c.user_id, c.project_id)$n$);
  execute def;
end $$;
