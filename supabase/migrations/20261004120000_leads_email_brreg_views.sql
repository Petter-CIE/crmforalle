-- Lead forms, e-mail templates, Brønnøysund watch, saved views, last activity.
-- (Applied in several parts; the activity type check was widened in "activity_types_lead_brreg".)

-- 0) New activity types: lead (web form), brreg (registry change), email_sent (sent from the CRM)
alter table public.activities drop constraint activities_type_check,
  add constraint activities_type_check check (type in ('note','call','meeting','email','stage_change','won','lost','created','lead','brreg','email_sent'));

-- Members may log e-mails they sent from the CRM themselves.
create policy activities_insert_email_sent on public.activities for insert to authenticated
  with check (private.is_member(workspace_id) and author_id = (select auth.uid()) and type = 'email_sent');

-- 1) Lead forms -------------------------------------------------------------------------
create table public.lead_forms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  public_key text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  active boolean not null default true,
  owner_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  create_deal boolean not null default true,
  create_task boolean not null default true,
  ask_phone boolean not null default true,
  ask_company boolean not null default true,
  require_message boolean not null default false,
  title text check (char_length(title) <= 120),
  intro text check (char_length(intro) <= 1000),
  button_text text check (char_length(button_text) <= 40),
  thank_you text check (char_length(thank_you) <= 1000),
  submissions integer not null default 0,
  last_submission_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index lead_forms_ws on public.lead_forms (workspace_id);
alter table public.lead_forms enable row level security;
create policy lead_forms_select on public.lead_forms for select to authenticated using (private.is_member(workspace_id));
create policy lead_forms_manage on public.lead_forms for all to authenticated
  using (private.has_role(workspace_id, array['owner','admin']::public.member_role[]))
  with check (private.has_role(workspace_id, array['owner','admin']::public.member_role[]));
grant select, insert, update, delete on public.lead_forms to authenticated;

create table private.lead_log (
  form_id uuid not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index lead_log_form_time on private.lead_log (form_id, created_at);
alter table private.lead_log enable row level security;

-- What the public form page needs (no secrets).
create or replace function public.lead_form_public(p_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'name', f.name, 'title', f.title, 'intro', f.intro, 'button_text', f.button_text, 'thank_you', f.thank_you,
    'ask_phone', f.ask_phone, 'ask_company', f.ask_company, 'require_message', f.require_message,
    'workspace', w.name, 'logo_path', w.logo_path)
  from public.lead_forms f join public.workspaces w on w.id = f.workspace_id
  where f.public_key = p_key and f.active and w.suspended_at is null;
$$;

-- Receives one submission: finds or creates the contact (and company), creates a deal, a note and
-- a follow-up task, and notifies the owner. Called by the app's public endpoint with the visitor's IP.
create or replace function public.lead_submit(p_key text, p_data jsonb, p_ip text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  f public.lead_forms;
  w public.workspaces;
  v_ip text := md5(coalesce(p_ip, '') || 'allseats-lead');
  v_name text := left(btrim(coalesce(p_data->>'name', '')), 120);
  v_email text := lower(left(btrim(coalesce(p_data->>'email', '')), 200));
  v_phone text := left(btrim(coalesce(p_data->>'phone', '')), 50);
  v_company text := left(btrim(coalesce(p_data->>'company', '')), 200);
  v_message text := left(btrim(coalesce(p_data->>'message', '')), 5000);
  v_first text; v_last text;
  v_contact uuid; v_company_id uuid; v_deal uuid; v_stage uuid; v_owner uuid;
  v_digits text := regexp_replace(coalesce(p_data->>'phone', ''), '\D', '', 'g');
  v_url text;
begin
  select * into f from public.lead_forms where public_key = p_key and active;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into w from public.workspaces where id = f.workspace_id;
  if w.suspended_at is not null then raise exception 'not_found' using errcode = 'P0002'; end if;

  -- Simple abuse limits: 10 per hour from one address, 500 per day per form.
  if (select count(*) from private.lead_log where form_id = f.id and ip_hash = v_ip and created_at > now() - interval '1 hour') >= 10
     or (select count(*) from private.lead_log where form_id = f.id and created_at > now() - interval '1 day') >= 500 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if v_name = '' or (v_email = '' and v_digits = '') then raise exception 'invalid' using errcode = '22023'; end if;
  if v_email <> '' and v_email !~ '^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$' then raise exception 'invalid' using errcode = '22023'; end if;
  if f.require_message and v_message = '' then raise exception 'invalid' using errcode = '22023'; end if;

  insert into private.lead_log (form_id, ip_hash) values (f.id, v_ip);

  v_owner := coalesce(f.owner_id, f.created_by, w.created_by);
  if not exists (select 1 from public.members m where m.workspace_id = w.id and m.user_id = v_owner) then
    select m.user_id into v_owner from public.members m where m.workspace_id = w.id order by (m.role = 'owner') desc, m.created_at limit 1;
  end if;

  v_first := split_part(v_name, ' ', 1);
  v_last := nullif(btrim(substr(v_name, char_length(v_first) + 1)), '');

  -- Existing contact with the same e-mail or phone?
  select c.id, c.company_id into v_contact, v_company_id from public.contacts c
   where c.workspace_id = w.id
     and ((v_email <> '' and lower(c.email) = v_email)
       or (char_length(v_digits) >= 8 and right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 8) = right(v_digits, 8)))
   order by c.created_at limit 1;

  if v_company <> '' and v_company_id is null then
    select id into v_company_id from public.companies where workspace_id = w.id and lower(name) = lower(v_company) limit 1;
    if v_company_id is null then
      insert into public.companies (workspace_id, name, owner_id) values (w.id, v_company, v_owner) returning id into v_company_id;
    end if;
  end if;

  if v_contact is null then
    insert into public.contacts (workspace_id, first_name, last_name, email, phone, company_id, owner_id)
    values (w.id, v_first, v_last, nullif(v_email, ''), nullif(v_phone, ''), v_company_id, v_owner)
    returning id into v_contact;
  end if;

  if f.create_deal then
    select id into v_stage from public.pipeline_stages where workspace_id = w.id and not is_won and not is_lost order by position limit 1;
    if v_stage is not null then
      insert into public.deals (workspace_id, title, value, stage_id, company_id, contact_id, project_id, owner_id, position)
      values (w.id, left('Nettskjema: ' || coalesce(nullif(v_company, ''), v_name), 200), 0, v_stage, v_company_id, v_contact, f.project_id, v_owner,
              (extract(epoch from now()) * 1000)::bigint)
      returning id into v_deal;
    end if;
  end if;

  insert into public.activities (workspace_id, type, body, company_id, contact_id, deal_id)
  values (w.id, 'lead',
    left(concat_ws(E'\n', '«' || f.name || '»', nullif(v_message, ''), '',
      concat_ws(' · ', v_name, nullif(v_company, ''), nullif(v_email, ''), nullif(v_phone, ''))), 10000),
    v_company_id, v_contact, v_deal);

  if f.create_task then
    insert into public.tasks (workspace_id, title, due_at, assignee_id, contact_id, company_id, deal_id, project_id)
    values (w.id, left('Følg opp henvendelse: ' || v_name, 300), now(), v_owner, v_contact, v_company_id, v_deal, f.project_id);
  end if;

  update public.lead_forms set submissions = submissions + 1, last_submission_at = now() where id = f.id;

  v_url := case when v_deal is not null then '/app/salg/' || v_deal else '/app/kontakter/' || v_contact end;
  perform private.push_enqueue(array[v_owner], 'Ny henvendelse: ' || v_name, coalesce(nullif(left(v_message, 140), ''), f.name), v_url, 'lead-' || v_contact);

  return (select jsonb_build_object(
    'owner_email', p.email, 'owner_name', coalesce(p.full_name, p.email), 'locale', p.locale, 'notify', p.notify_email,
    'workspace', w.name, 'form', f.name, 'url', v_url, 'thank_you', f.thank_you,
    'name', v_name, 'email', v_email, 'phone', v_phone, 'company', v_company, 'message', v_message)
    from public.profiles p where p.id = v_owner);
end; $$;

revoke all on function public.lead_submit(text, jsonb, text) from public;
grant execute on function public.lead_submit(text, jsonb, text) to anon, authenticated;
grant execute on function public.lead_form_public(text) to anon, authenticated;

-- 2) E-mail templates (shared by the team) -------------------------------------------------
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  subject text not null check (char_length(subject) between 1 and 200),
  body text not null check (char_length(body) between 1 and 20000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_templates_ws on public.email_templates (workspace_id);
alter table public.email_templates enable row level security;
create policy email_templates_all on public.email_templates for all to authenticated
  using (private.is_member(workspace_id)) with check (private.is_member(workspace_id));
grant select, insert, update, delete on public.email_templates to authenticated;

-- 3) Brønnøysund watch ------------------------------------------------------------------
alter table public.companies
  add column if not exists brreg_snapshot jsonb,
  add column if not exists brreg_status text check (brreg_status in ('konkurs', 'avvikling', 'tvangsavvikling', 'slettet')),
  add column if not exists brreg_checked_at timestamptz;

create table private.brreg_tickets (token text primary key, created_at timestamptz not null default now(), applied_at timestamptz);
alter table private.brreg_tickets enable row level security;
create table private.brreg_state (id int primary key default 1 check (id = 1), last_run timestamptz);
alter table private.brreg_state enable row level security;
insert into private.brreg_state (id, last_run) values (1, null) on conflict do nothing;

create or replace function private.brreg_kick() returns void
language plpgsql security definer set search_path = '' as $$
declare ticket text;
begin
  ticket := encode(extensions.gen_random_bytes(24), 'hex');
  insert into private.brreg_tickets (token) values (ticket);
  perform net.http_get(url := 'https://allseats.no/api/cron/brreg?ticket=' || ticket, timeout_milliseconds := 280000);
end; $$;

-- Which organisation numbers to look at: those with no snapshot yet, plus the date of the last run.
create or replace function public.brreg_claim(p_ticket text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.brreg_tickets where token = p_ticket and applied_at is null and created_at > now() - interval '30 minutes') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'since', (select last_run from private.brreg_state where id = 1),
    'orgs', coalesce((select jsonb_agg(distinct c.org_number) from public.companies c
                       join public.workspaces w on w.id = c.workspace_id and w.suspended_at is null
                      where c.org_number ~ '^\d{9}$'), '[]'::jsonb),
    'new', coalesce((select jsonb_agg(distinct c.org_number) from public.companies c
                      join public.workspaces w on w.id = c.workspace_id and w.suspended_at is null
                     where c.org_number ~ '^\d{9}$' and c.brreg_snapshot is null), '[]'::jsonb));
end; $$;

-- Stores the new registry data. p_items: [{org, snapshot, status, changes: [text]}]. Changes are logged
-- on each company that has that number and pushed to its owner (only when there was an earlier snapshot).
create or replace function public.brreg_apply(p_ticket text, p_items jsonb, p_run_started timestamptz) returns integer
language plpgsql security definer set search_path = '' as $$
declare it jsonb; c record; n integer := 0; v_changes text;
begin
  update private.brreg_tickets set applied_at = now()
   where token = p_ticket and applied_at is null and created_at > now() - interval '30 minutes';
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;

  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_changes := (select string_agg(x, E'\n') from jsonb_array_elements_text(coalesce(it->'changes', '[]'::jsonb)) x);
    for c in select co.id, co.workspace_id, co.owner_id, co.name, co.brreg_snapshot
               from public.companies co where co.org_number = it->>'org' loop
      update public.companies
         set brreg_snapshot = it->'snapshot',
             brreg_status = nullif(it->>'status', ''),
             brreg_checked_at = now()
       where id = c.id;
      if c.brreg_snapshot is not null and v_changes is not null then
        insert into public.activities (workspace_id, type, body, company_id) values (c.workspace_id, 'brreg', v_changes, c.id);
        perform private.push_enqueue(
          coalesce(array[c.owner_id], array(select m.user_id from public.members m where m.workspace_id = c.workspace_id and m.role in ('owner','admin'))),
          'Endring i Brønnøysund: ' || c.name, left(v_changes, 280), '/app/bedrifter/' || c.id, 'brreg-' || c.id);
        n := n + 1;
      end if;
    end loop;
  end loop;
  update private.brreg_state set last_run = p_run_started where id = 1;
  return n;
end; $$;
revoke all on function public.brreg_claim(text) from public;
revoke all on function public.brreg_apply(text, jsonb, timestamptz) from public;
grant execute on function public.brreg_claim(text) to anon, authenticated;
grant execute on function public.brreg_apply(text, jsonb, timestamptz) to anon, authenticated;

select cron.schedule('allseats-brreg-watch', '30 4 * * *', 'select private.brreg_kick()');

-- 4) Last activity on companies and contacts (for "no activity in N days" filters) -----------
alter table public.companies add column if not exists last_activity_at timestamptz;
alter table public.contacts add column if not exists last_activity_at timestamptz;

create or replace function private.touch_last_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.type in ('brreg') then return null; end if;
  if new.company_id is not null then
    update public.companies set last_activity_at = greatest(coalesce(last_activity_at, new.occurred_at), new.occurred_at) where id = new.company_id;
  end if;
  if new.contact_id is not null then
    update public.contacts set last_activity_at = greatest(coalesce(last_activity_at, new.occurred_at), new.occurred_at) where id = new.contact_id;
  end if;
  return null;
end; $$;
create trigger activities_touch_last after insert on public.activities
  for each row execute function private.touch_last_activity();

update public.companies c set last_activity_at = (select max(a.occurred_at) from public.activities a where a.company_id = c.id and a.type <> 'brreg');
update public.contacts c set last_activity_at = (select max(a.occurred_at) from public.activities a where a.contact_id = c.id and a.type <> 'brreg');

-- 5) Saved views ------------------------------------------------------------------------
create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity text not null check (entity in ('companies', 'contacts')),
  name text not null check (char_length(name) between 1 and 60),
  query text not null check (char_length(query) <= 1000),
  shared boolean not null default false,
  created_at timestamptz not null default now()
);
create index saved_views_ws on public.saved_views (workspace_id, entity);
alter table public.saved_views enable row level security;
create policy saved_views_select on public.saved_views for select to authenticated
  using (private.is_member(workspace_id) and (user_id = (select auth.uid()) or shared));
create policy saved_views_insert on public.saved_views for insert to authenticated
  with check (private.is_member(workspace_id) and user_id = (select auth.uid()));
create policy saved_views_delete on public.saved_views for delete to authenticated
  using (private.is_member(workspace_id) and (user_id = (select auth.uid()) or (shared and private.has_role(workspace_id, array['owner','admin']::public.member_role[]))));
grant select, insert, delete on public.saved_views to authenticated;

-- Previous snapshots for the organisation numbers the watch is about to compare.
create or replace function public.brreg_snapshots(p_ticket text, p_orgs text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.brreg_tickets where token = p_ticket and applied_at is null and created_at > now() - interval '30 minutes') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return coalesce((select jsonb_object_agg(org_number, brreg_snapshot)
    from (select distinct on (org_number) org_number, brreg_snapshot from public.companies
           where org_number = any(p_orgs) and brreg_snapshot is not null order by org_number, brreg_checked_at desc) s), '{}'::jsonb);
end; $$;
revoke all on function public.brreg_snapshots(text, text[]) from public;
grant execute on function public.brreg_snapshots(text, text[]) to anon, authenticated;
