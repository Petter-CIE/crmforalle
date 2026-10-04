-- Meeting booking links: every user can publish a page where customers pick a free time.
-- A booking creates (or finds) the contact, a "meeting" task for the user and a timeline entry.

create table public.booking_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,40}$'),
  title text not null default 'Møte' check (char_length(title) between 1 and 100),
  intro text check (char_length(intro) <= 1000),
  location text check (char_length(location) <= 300),
  duration_min integer not null default 30 check (duration_min in (15, 20, 30, 45, 60, 90)),
  weekdays integer[] not null default '{1,2,3,4,5}',
  day_start time not null default '09:00',
  day_end time not null default '16:00',
  buffer_min integer not null default 0 check (buffer_min between 0 and 60),
  notice_hours integer not null default 12 check (notice_hours between 0 and 336),
  days_ahead integer not null default 30 check (days_ahead between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id),
  check (day_end > day_start)
);
alter table public.booking_pages enable row level security;
create policy booking_pages_select on public.booking_pages for select to authenticated using (private.is_member(workspace_id));
create policy booking_pages_own on public.booking_pages for all to authenticated
  using (user_id = (select auth.uid()) and private.is_member(workspace_id))
  with check (user_id = (select auth.uid()) and private.is_member(workspace_id));
create policy booking_pages_writable_ins on public.booking_pages as restrictive for insert to authenticated with check (private.workspace_writable(workspace_id));
create policy booking_pages_writable_upd on public.booking_pages as restrictive for update to authenticated using (private.workspace_writable(workspace_id));
grant select, insert, update, delete on public.booking_pages to authenticated;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  page_id uuid references public.booking_pages(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  name text not null,
  email text not null,
  phone text,
  company text,
  message text,
  contact_id uuid references public.contacts(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  cancel_token text not null unique default encode(extensions.gen_random_bytes(20), 'hex'),
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index bookings_user_time_idx on public.bookings (user_id, starts_at) where cancelled_at is null;
alter table public.bookings enable row level security;
create policy bookings_select on public.bookings for select to authenticated using (private.is_member(workspace_id));
grant select (id, workspace_id, page_id, user_id, starts_at, ends_at, name, email, phone, company, message, contact_id, task_id, cancelled_at, created_at)
  on public.bookings to authenticated;

create table private.booking_log (page_id uuid not null, ip_hash text not null, created_at timestamptz not null default now());
alter table private.booking_log enable row level security;

-- Public: the page and the times already taken (no names), for the coming days.
create or replace function public.booking_page_public(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare p public.booking_pages; w public.workspaces; v_host text;
begin
  select * into p from public.booking_pages where slug = lower(p_slug) and active;
  if not found then return null; end if;
  select * into w from public.workspaces where id = p.workspace_id;
  if w.suspended_at is not null or not private.workspace_writable(w.id) then return null; end if;
  select coalesce(nullif(full_name, ''), split_part(email, '@', 1)) into v_host from public.profiles where id = p.user_id;
  return jsonb_build_object(
    'slug', p.slug, 'title', p.title, 'intro', p.intro, 'location', p.location, 'duration', p.duration_min,
    'weekdays', to_jsonb(p.weekdays), 'day_start', to_char(p.day_start, 'HH24:MI'), 'day_end', to_char(p.day_end, 'HH24:MI'),
    'buffer', p.buffer_min, 'notice_hours', p.notice_hours, 'days_ahead', p.days_ahead,
    'host', v_host, 'company', w.name, 'logo_path', w.logo_path,
    'busy', coalesce((select jsonb_agg(jsonb_build_array(b.starts_at, b.ends_at) order by b.starts_at)
                        from public.bookings b
                       where b.user_id = p.user_id and b.cancelled_at is null
                         and b.ends_at > now() and b.starts_at < now() + make_interval(days => p.days_ahead + 1)), '[]'::jsonb)
  );
end; $$;

-- Public: books a time. Checks the slot again (hours, notice, overlap) and creates contact + task.
create or replace function public.booking_create(p_slug text, p_start timestamptz, p_data jsonb, p_ip text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p public.booking_pages; w public.workspaces;
  v_ip text := md5(coalesce(p_ip, '') || 'allseats-booking');
  v_end timestamptz;
  v_local timestamp;
  v_name text := left(btrim(coalesce(p_data->>'name', '')), 120);
  v_email text := lower(left(btrim(coalesce(p_data->>'email', '')), 200));
  v_phone text := left(btrim(coalesce(p_data->>'phone', '')), 50);
  v_company text := left(btrim(coalesce(p_data->>'company', '')), 200);
  v_message text := left(btrim(coalesce(p_data->>'message', '')), 2000);
  v_first text; v_last text; v_contact uuid; v_company_id uuid; v_task uuid; v_booking public.bookings;
begin
  select * into p from public.booking_pages where slug = lower(p_slug) and active;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into w from public.workspaces where id = p.workspace_id;
  if w.suspended_at is not null or not private.workspace_writable(w.id) then raise exception 'not_found' using errcode = 'P0002'; end if;
  if (select count(*) from private.booking_log where page_id = p.id and ip_hash = v_ip and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if v_name = '' or v_email !~ '^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$' then raise exception 'invalid' using errcode = '22023'; end if;

  -- The slot must be on the page's grid, inside the opening hours (Oslo time) and in the booking window.
  v_end := p_start + make_interval(mins => p.duration_min);
  v_local := p_start at time zone 'Europe/Oslo';
  if p_start < now() + make_interval(hours => p.notice_hours)
     or p_start > now() + make_interval(days => p.days_ahead)
     or not (extract(isodow from v_local)::int = any (p.weekdays))
     or v_local::time < p.day_start
     or (v_end at time zone 'Europe/Oslo')::time > p.day_end
     or (v_end at time zone 'Europe/Oslo')::date <> v_local::date
     or (extract(epoch from (v_local::time - p.day_start))::int / 60) % p.duration_min <> 0 then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  -- One booking at a time per user (serialises concurrent requests), then the overlap check.
  perform pg_advisory_xact_lock(hashtext(p.user_id::text));
  if exists (select 1 from public.bookings b
              where b.user_id = p.user_id and b.cancelled_at is null
                and b.starts_at < v_end + make_interval(mins => p.buffer_min)
                and b.ends_at > p_start - make_interval(mins => p.buffer_min)) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  insert into private.booking_log (page_id, ip_hash) values (p.id, v_ip);

  v_first := split_part(v_name, ' ', 1);
  v_last := nullif(btrim(substr(v_name, char_length(v_first) + 1)), '');
  select c.id, c.company_id into v_contact, v_company_id from public.contacts c
   where c.workspace_id = w.id and lower(c.email) = v_email order by c.created_at limit 1;
  if v_company <> '' and v_company_id is null then
    select id into v_company_id from public.companies where workspace_id = w.id and lower(name) = lower(v_company) limit 1;
    if v_company_id is null then
      insert into public.companies (workspace_id, name, owner_id) values (w.id, v_company, p.user_id) returning id into v_company_id;
    end if;
  end if;
  if v_contact is null then
    insert into public.contacts (workspace_id, first_name, last_name, email, phone, company_id, owner_id)
    values (w.id, v_first, v_last, v_email, nullif(v_phone, ''), v_company_id, p.user_id)
    returning id into v_contact;
  end if;

  insert into public.tasks (workspace_id, title, description, due_at, assignee_id, contact_id, company_id, created_by)
  values (w.id, left(p.title || ': ' || v_name, 200),
          nullif(concat_ws(E'\n', nullif(v_company, ''), nullif(v_phone, ''), v_email, nullif(v_message, ''), nullif(p.location, '')), ''),
          p_start, p.user_id, v_contact, v_company_id, p.user_id)
  returning id into v_task;

  insert into public.activities (workspace_id, type, body, contact_id, company_id, author_id)
  values (w.id, 'meeting',
          'Booket møte ' || to_char(v_local, 'DD.MM.YYYY HH24:MI') || ' (' || p.duration_min || ' min)' ||
          case when v_message <> '' then E'\n' || v_message else '' end,
          v_contact, v_company_id, p.user_id);

  insert into public.bookings (workspace_id, page_id, user_id, starts_at, ends_at, name, email, phone, company, message, contact_id, task_id)
  values (w.id, p.id, p.user_id, p_start, v_end, v_name, v_email, nullif(v_phone, ''), nullif(v_company, ''), nullif(v_message, ''), v_contact, v_task)
  returning * into v_booking;

  return jsonb_build_object(
    'id', v_booking.id, 'cancel_token', v_booking.cancel_token, 'starts_at', v_booking.starts_at, 'ends_at', v_booking.ends_at,
    'title', p.title, 'location', p.location, 'company', w.name, 'task_id', v_task, 'contact_id', v_contact,
    'host_name', (select coalesce(nullif(full_name, ''), split_part(email, '@', 1)) from public.profiles where id = p.user_id),
    'host_email', (select email from public.profiles where id = p.user_id),
    'host_locale', (select locale from public.profiles where id = p.user_id)
  );
end; $$;

-- Public: the booking behind a cancel link, and cancelling it (removes the task).
create or replace function public.booking_by_token(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('starts_at', b.starts_at, 'ends_at', b.ends_at, 'name', b.name, 'title', p.title,
                            'company', w.name, 'cancelled', b.cancelled_at is not null, 'slug', p.slug)
    from public.bookings b
    join public.workspaces w on w.id = b.workspace_id
    left join public.booking_pages p on p.id = b.page_id
   where b.cancel_token = p_token;
$$;

create or replace function public.booking_cancel(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare b public.bookings;
begin
  update public.bookings set cancelled_at = now() where cancel_token = p_token and cancelled_at is null and starts_at > now()
  returning * into b;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if b.task_id is not null then delete from public.tasks where id = b.task_id and done_at is null; end if;
  insert into public.activities (workspace_id, type, body, contact_id, author_id)
  values (b.workspace_id, 'note', 'Avbestilte møtet ' || to_char(b.starts_at at time zone 'Europe/Oslo', 'DD.MM.YYYY HH24:MI'), b.contact_id, b.user_id);
  return jsonb_build_object('starts_at', b.starts_at, 'name', b.name, 'email', b.email,
                            'host_email', (select email from public.profiles where id = b.user_id),
                            'host_locale', (select locale from public.profiles where id = b.user_id));
end; $$;

revoke all on function public.booking_page_public(text) from public;
revoke all on function public.booking_create(text, timestamptz, jsonb, text) from public;
revoke all on function public.booking_by_token(text) from public;
revoke all on function public.booking_cancel(text) from public;
grant execute on function public.booking_page_public(text) to anon, authenticated;
grant execute on function public.booking_create(text, timestamptz, jsonb, text) to anon, authenticated;
grant execute on function public.booking_by_token(text) to anon, authenticated;
grant execute on function public.booking_cancel(text) to anon, authenticated;
