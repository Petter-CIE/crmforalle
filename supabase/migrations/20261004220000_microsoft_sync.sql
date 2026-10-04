-- Outlook / Microsoft 365: each user can connect their own mailbox (read only).
-- Every 15 minutes e-mails exchanged with existing contacts are logged on the contact's timeline
-- (other mail is skipped), and busy times from the Outlook calendar block the booking page.
-- Tokens are encrypted by the app (INTEGRATION_SECRET) before they reach the database.

create table public.mail_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'microsoft' check (provider in ('microsoft')),
  account_email text,
  refresh_token text not null,
  mail_enabled boolean not null default true,
  calendar_enabled boolean not null default true,
  synced_until timestamptz not null default now() - interval '14 days',
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id, provider)
);
alter table public.mail_connections enable row level security;
-- Users see and manage only their own connection (never the token column).
create policy mail_connections_own on public.mail_connections for all to authenticated
  using (user_id = (select auth.uid()) and private.is_member(workspace_id))
  with check (user_id = (select auth.uid()) and private.is_member(workspace_id));
grant select (id, workspace_id, user_id, provider, account_email, mail_enabled, calendar_enabled, synced_until, last_sync_at, last_error, created_at)
  on public.mail_connections to authenticated;
grant insert (workspace_id, user_id, provider, account_email, refresh_token, mail_enabled, calendar_enabled),
      update (account_email, refresh_token, mail_enabled, calendar_enabled, last_error),
      delete on public.mail_connections to authenticated;

-- Busy blocks from connected calendars (no titles, only times), used by booking pages.
create table public.calendar_busy (
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);
create index calendar_busy_user_idx on public.calendar_busy (user_id, starts_at);
alter table public.calendar_busy enable row level security;

-- Ticket pattern for the 15-minute job (like the other background jobs).
create table private.mail_tickets (token text primary key, created_at timestamptz not null default now(), applied_at timestamptz);
alter table private.mail_tickets enable row level security;

create or replace function private.mail_kick() returns void
language plpgsql security definer set search_path = '' as $$
declare ticket text;
begin
  if not exists (select 1 from public.mail_connections) then return; end if;
  ticket := encode(extensions.gen_random_bytes(24), 'hex');
  insert into private.mail_tickets (token) values (ticket);
  perform net.http_get(url := 'https://allseats.no/api/cron/mail?ticket=' || ticket, timeout_milliseconds := 55000);
end; $$;

create or replace function public.mail_claim(p_ticket text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.mail_tickets where token = p_ticket and applied_at is null and created_at > now() - interval '15 minutes') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update private.mail_tickets set applied_at = now() where token = p_ticket;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'workspace_id', c.workspace_id, 'user_id', c.user_id, 'refresh_token', c.refresh_token,
      'mail', c.mail_enabled, 'calendar', c.calendar_enabled, 'synced_until', c.synced_until,
      'user_email', (select lower(email) from public.profiles where id = c.user_id)))
      from public.mail_connections c
      join public.workspaces w on w.id = c.workspace_id
     where w.suspended_at is null), '[]'::jsonb);
end; $$;

-- Results for one connection: new refresh token, sync point, error, the e-mails and busy blocks.
-- Only e-mails with at least one address of an existing contact are stored.
create or replace function public.mail_apply(p_ticket text, p_connection uuid, p_result jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  c public.mail_connections;
  m jsonb;
  v_members text[];
  v_ext text[];
  v_from text;
  v_id uuid;
  n integer := 0;
begin
  if not exists (select 1 from private.mail_tickets where token = p_ticket and created_at > now() - interval '15 minutes') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into c from public.mail_connections where id = p_connection for update;
  if not found then return 0; end if;

  update public.mail_connections
     set refresh_token = coalesce(nullif(p_result->>'refresh_token', ''), refresh_token),
         synced_until = coalesce((p_result->>'synced_until')::timestamptz, synced_until),
         account_email = coalesce(nullif(p_result->>'account_email', ''), account_email),
         last_sync_at = now(),
         last_error = nullif(left(coalesce(p_result->>'error', ''), 300), '')
   where id = c.id;

  if p_result ? 'busy' then
    delete from public.calendar_busy where user_id = c.user_id;
    insert into public.calendar_busy (user_id, starts_at, ends_at)
    select c.user_id, (b->>0)::timestamptz, (b->>1)::timestamptz
      from jsonb_array_elements(p_result->'busy') b
     limit 2000;
  end if;

  select array_agg(lower(p.email)) into v_members
    from public.members mm join public.profiles p on p.id = mm.user_id where mm.workspace_id = c.workspace_id;

  for m in select * from jsonb_array_elements(coalesce(p_result->'messages', '[]'::jsonb)) limit 500 loop
    v_from := lower(btrim(coalesce(m->>'from', '')));
    select coalesce(array_agg(distinct a), '{}') into v_ext
      from unnest(array[v_from] || array(select lower(btrim(x)) from jsonb_array_elements_text(coalesce(m->'to', '[]')) x)
                                 || array(select lower(btrim(x)) from jsonb_array_elements_text(coalesce(m->'cc', '[]')) x)) a
     where a ~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' and a <> all (coalesce(v_members, '{}'));
    -- Only conversations with known contacts.
    if not exists (select 1 from public.contacts ct where ct.workspace_id = c.workspace_id and lower(ct.email) = any (v_ext)) then continue; end if;
    if exists (select 1 from public.inbound_emails where workspace_id = c.workspace_id and message_id = left(m->>'id', 500)) then continue; end if;
    insert into public.inbound_emails (workspace_id, message_id, from_email, from_name, to_emails, cc_emails, external_emails, subject, body, sent_at, author_id)
    values (c.workspace_id, left(m->>'id', 500), left(v_from, 320), left(m->>'from_name', 200),
            (array(select lower(x) from jsonb_array_elements_text(coalesce(m->'to', '[]')) x))[1:50],
            (array(select lower(x) from jsonb_array_elements_text(coalesce(m->'cc', '[]')) x))[1:50],
            v_ext[1:50], left(m->>'subject', 500), left(m->>'body', 20000), coalesce((m->>'sent_at')::timestamptz, now()), c.user_id)
    returning id into v_id;
    if private.link_inbound(v_id) > 0 then n := n + 1; end if;
  end loop;
  return n;
end; $$;

-- Booking pages also avoid busy times from the connected Outlook calendar.
do $$
declare def text;
begin
  def := pg_get_functiondef('public.booking_page_public(text)'::regprocedure);
  def := replace(def,
    $old$'busy', coalesce((select jsonb_agg(jsonb_build_array(b.starts_at, b.ends_at) order by b.starts_at)
                        from public.bookings b
                       where b.user_id = p.user_id and b.cancelled_at is null
                         and b.ends_at > now() and b.starts_at < now() + make_interval(days => p.days_ahead + 1)), '[]'::jsonb)$old$,
    $new$'busy', coalesce((select jsonb_agg(jsonb_build_array(x.s, x.e) order by x.s) from (
                          select b.starts_at s, b.ends_at e from public.bookings b
                           where b.user_id = p.user_id and b.cancelled_at is null
                             and b.ends_at > now() and b.starts_at < now() + make_interval(days => p.days_ahead + 1)
                          union all
                          select cb.starts_at, cb.ends_at from public.calendar_busy cb
                           where cb.user_id = p.user_id and cb.ends_at > now()
                             and cb.starts_at < now() + make_interval(days => p.days_ahead + 1)) x), '[]'::jsonb)$new$);
  execute def;
end $$;

-- booking_create also refuses times that are busy in Outlook.
do $$
declare def text;
begin
  def := pg_get_functiondef('public.booking_create(text, timestamptz, jsonb, text)'::regprocedure);
  def := replace(def,
    $old$                and b.ends_at > p_start - make_interval(mins => p.buffer_min)) then$old$,
    $new$                and b.ends_at > p_start - make_interval(mins => p.buffer_min))
     or exists (select 1 from public.calendar_busy cb
                 where cb.user_id = p.user_id
                   and cb.starts_at < v_end + make_interval(mins => p.buffer_min)
                   and cb.ends_at > p_start - make_interval(mins => p.buffer_min)) then$new$);
  execute def;
end $$;

revoke all on function public.mail_claim(text) from public;
revoke all on function public.mail_apply(text, uuid, jsonb) from public;
grant execute on function public.mail_claim(text) to anon, authenticated;
grant execute on function public.mail_apply(text, uuid, jsonb) to anon, authenticated;

select cron.schedule('allseats-mail-sync', '*/15 * * * *', 'select private.mail_kick()');

-- Busy times from Outlook disappear when the connection is removed or the calendar is switched off.
create or replace function private.mail_connection_cleanup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.calendar_busy where user_id = old.user_id;
    return old;
  end if;
  if not new.calendar_enabled and old.calendar_enabled then
    delete from public.calendar_busy where user_id = new.user_id;
  end if;
  return new;
end; $$;
create trigger mail_connections_cleanup after delete or update of calendar_enabled on public.mail_connections
  for each row execute function private.mail_connection_cleanup();
