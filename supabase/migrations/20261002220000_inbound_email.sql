-- E-mail to the CRM: each company gets a secret address (crm-<token>@allseats.no). Mail sent there
-- (BCC or forward) lands in a One.com catch-all mailbox; /api/inbound/poll reads it and calls
-- ingest_inbound_email(), which stores the message and links it to matching contacts/companies.

alter table public.workspaces add column inbound_token text unique
  check (inbound_token ~ '^[a-z0-9]{10}$');
grant select (inbound_token) on public.workspaces to authenticated;

create table public.inbound_emails (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  message_id text,
  from_email text not null,
  from_name text,
  to_emails text[] not null default '{}',
  cc_emails text[] not null default '{}',
  external_emails text[] not null default '{}',
  subject text,
  body text,
  sent_at timestamptz not null default now(),
  author_id uuid references public.profiles(id) on delete set null,
  status text not null default 'unmatched' check (status in ('unmatched', 'linked')),
  linked_count integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index inbound_emails_message_uidx on public.inbound_emails(workspace_id, message_id) where message_id is not null;
create index inbound_emails_ws_status_idx on public.inbound_emails(workspace_id, status, sent_at desc);
create index inbound_emails_author_idx on public.inbound_emails(author_id);

alter table public.inbound_emails enable row level security;
create policy inbound_emails_select on public.inbound_emails for select to authenticated
  using (private.is_member(workspace_id));
create policy inbound_emails_delete on public.inbound_emails for delete to authenticated
  using (private.is_member(workspace_id));
grant select, delete on public.inbound_emails to authenticated;

-- throttle for the public poll endpoint
create table private.inbound_state (id boolean primary key default true check (id), last_run timestamptz not null default 'epoch');
insert into private.inbound_state default values;

-- addresses that belong to private persons' mail providers, never used to match a company by domain
create or replace function private.is_free_mail_domain(d text)
returns boolean language sql immutable set search_path = '' as $$
  select d = any (array[
    'gmail.com','googlemail.com','hotmail.com','hotmail.no','outlook.com','outlook.no','live.com','live.no','msn.com',
    'yahoo.com','yahoo.no','icloud.com','me.com','mac.com','online.no','broadpark.no','getmail.no','start.no',
    'frisurf.no','altibox.no','lyse.net','c2i.net','enivest.net','tele2.no','proton.me','protonmail.com','aol.com','gmx.com'
  ]);
$$;

create or replace function private.host_of(url text)
returns text language sql immutable set search_path = '' as $$
  select nullif(regexp_replace(lower(trim(url)), '^([a-z]+://)?(www\.)?([^/:?#]+).*$', '\3'), '');
$$;

-- Creates timeline entries for one stored e-mail. Contacts are matched on e-mail address; when no
-- contact matches, companies are matched on the e-mail domain (company e-mail or website).
create or replace function private.link_inbound(p_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  e public.inbound_emails;
  v_body text;
  v_count integer := 0;
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
    insert into public.activities (workspace_id, type, body, contact_id, company_id, author_id, occurred_at)
    values (e.workspace_id, 'email', v_body, r.id, r.company_id, e.author_id, e.sent_at);
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
      insert into public.activities (workspace_id, type, body, company_id, author_id, occurred_at)
      values (e.workspace_id, 'email', v_body, r.id, e.author_id, e.sent_at);
      v_count := v_count + 1;
    end loop;
  end if;

  if v_count > 0 then
    update public.inbound_emails set status = 'linked', linked_count = v_count where id = p_id;
  end if;
  return v_count;
end; $$;

-- Called by the poll endpoint (no user session). The secret token in the address is the
-- authorisation, exactly as for the e-mail itself.
create or replace function public.ingest_inbound_email(
  p_token text, p_message_id text, p_from_email text, p_from_name text,
  p_to text[], p_cc text[], p_forwarded_from text, p_subject text, p_body text, p_sent_at timestamptz
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_ws uuid;
  v_id uuid;
  v_members text[];
  v_author uuid;
  v_from text := lower(trim(p_from_email));
  v_all text[];
  v_ext text[];
begin
  if p_token !~ '^[a-z0-9]{10}$' then return 'unknown'; end if;
  select id into v_ws from public.workspaces where inbound_token = p_token and suspended_at is null;
  if v_ws is null then return 'unknown'; end if;
  if (select count(*) from public.inbound_emails where workspace_id = v_ws and created_at > now() - interval '1 day') >= 1000 then
    return 'limited';
  end if;
  if p_message_id is not null and exists (select 1 from public.inbound_emails where workspace_id = v_ws and message_id = left(p_message_id, 500)) then
    return 'duplicate';
  end if;

  select array_agg(lower(p.email)) into v_members
  from public.members m join public.profiles p on p.id = m.user_id where m.workspace_id = v_ws;
  select m.user_id into v_author
  from public.members m join public.profiles p on p.id = m.user_id
  where m.workspace_id = v_ws and lower(p.email) = v_from;

  -- everyone on the message who is not a colleague and not one of our own addresses
  select coalesce(array_agg(distinct a), '{}') into v_ext
  from unnest(array[v_from] || coalesce(p_to, '{}') || coalesce(p_cc, '{}')) as x(raw), lower(trim(raw)) a
  where a ~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' and a <> all (coalesce(v_members, '{}')) and a !~ '@allseats\.no$';
  -- a mail a colleague forwarded to the CRM: use the original sender from the forwarded header
  if cardinality(v_ext) = 0 and p_forwarded_from is not null then
    v_all := array[lower(trim(p_forwarded_from))];
    select coalesce(array_agg(a), '{}') into v_ext from unnest(v_all) a
    where a ~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' and a <> all (coalesce(v_members, '{}')) and a !~ '@allseats\.no$';
  end if;

  insert into public.inbound_emails (workspace_id, message_id, from_email, from_name, to_emails, cc_emails, external_emails,
                                     subject, body, sent_at, author_id)
  values (v_ws, left(p_message_id, 500), left(v_from, 320), left(p_from_name, 200),
          (coalesce(p_to, '{}'))[1:50], (coalesce(p_cc, '{}'))[1:50], v_ext[1:50],
          left(p_subject, 500), left(p_body, 20000), coalesce(p_sent_at, now()), v_author)
  returning id into v_id;

  if private.link_inbound(v_id) > 0 then return 'linked'; end if;
  return 'unmatched';
end; $$;

create or replace function public.inbound_try_lock()
returns boolean language sql security definer set search_path = '' as $$
  with u as (
    update private.inbound_state set last_run = now() where last_run < now() - interval '40 seconds' returning 1
  ) select exists (select 1 from u);
$$;

-- owner/admin: create or replace the company's address
create or replace function public.rotate_inbound_token(p_workspace uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  if not private.has_role(p_workspace, array['owner','admin']::public.member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- 10 characters × 5 random bits from the CSPRNG behind gen_random_uuid() (first byte is fully random)
  v := array_to_string(array(
    select substr('abcdefghijkmnpqrstuvwxyz23456789', get_byte(uuid_send(gen_random_uuid()), 0) % 32 + 1, 1)
    from generate_series(1, 10)
  ), '');
  update public.workspaces set inbound_token = v where id = p_workspace;
  return v;
end; $$;

create or replace function public.disable_inbound(p_workspace uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_role(p_workspace, array['owner','admin']::public.member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.workspaces set inbound_token = null where id = p_workspace;
end; $$;

-- when a contact gets an address (or a company an e-mail/website), link waiting e-mails
create or replace function private.relink_inbound()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record; v_key text;
begin
  if tg_table_name = 'contacts' then
    if new.email is null then return new; end if;
    for r in select id from public.inbound_emails
             where workspace_id = new.workspace_id and status = 'unmatched' and lower(new.email) = any (external_emails)
    loop perform private.link_inbound(r.id); end loop;
  else
    v_key := coalesce(nullif(split_part(lower(new.email), '@', 2), ''), private.host_of(new.website));
    if v_key is null then return new; end if;
    for r in select ie.id from public.inbound_emails ie
             where ie.workspace_id = new.workspace_id and ie.status = 'unmatched'
               and exists (select 1 from unnest(ie.external_emails) a
                           where split_part(a, '@', 2) in (split_part(lower(new.email), '@', 2), private.host_of(new.website)))
    loop perform private.link_inbound(r.id); end loop;
  end if;
  return new;
end; $$;

create trigger contacts_relink_inbound after insert or update of email on public.contacts
  for each row execute function private.relink_inbound();
create trigger companies_relink_inbound after insert or update of email, website on public.companies
  for each row execute function private.relink_inbound();

revoke all on function private.link_inbound(uuid) from public;
revoke all on function private.relink_inbound() from public;
revoke all on function public.ingest_inbound_email(text, text, text, text, text[], text[], text, text, text, timestamptz) from public;
grant execute on function public.ingest_inbound_email(text, text, text, text, text[], text[], text, text, text, timestamptz) to anon, authenticated;
revoke all on function public.inbound_try_lock() from public;
grant execute on function public.inbound_try_lock() to anon, authenticated;
revoke all on function public.rotate_inbound_token(uuid) from public, anon;
grant execute on function public.rotate_inbound_token(uuid) to authenticated;
revoke all on function public.disable_inbound(uuid) from public, anon;
grant execute on function public.disable_inbound(uuid) to authenticated;

-- poll the mailbox every minute
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.schedule('allseats-inbound-email', '* * * * *',
  $$ select net.http_get(url := 'https://allseats.no/api/inbound/poll', timeout_milliseconds := 55000) $$);
