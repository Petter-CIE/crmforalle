-- =============================================================================
-- 1. Custom fields on companies, contacts and deals
-- =============================================================================
create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity text not null check (entity in ('company', 'contact', 'deal')),
  label text not null check (char_length(label) between 1 and 60),
  type text not null check (type in ('text', 'number', 'date', 'select', 'checkbox', 'url')),
  options text[] not null default '{}' check (cardinality(options) <= 50),
  position double precision not null default 0,
  created_at timestamptz not null default now()
);
create index custom_fields_workspace_idx on public.custom_fields(workspace_id, entity, position);
alter table public.custom_fields enable row level security;
create policy custom_fields_select on public.custom_fields for select to authenticated
  using (private.is_member(workspace_id));
create policy custom_fields_manage on public.custom_fields for all to authenticated
  using (private.has_role(workspace_id, array['owner','admin']::public.member_role[]))
  with check (private.has_role(workspace_id, array['owner','admin']::public.member_role[]));

alter table public.companies add column custom jsonb not null default '{}'::jsonb check (jsonb_typeof(custom) = 'object');
alter table public.contacts add column custom jsonb not null default '{}'::jsonb check (jsonb_typeof(custom) = 'object');
alter table public.deals add column custom jsonb not null default '{}'::jsonb check (jsonb_typeof(custom) = 'object');

-- =============================================================================
-- 2. Products and quotes (tilbud)
-- =============================================================================
alter table public.workspaces
  add column quote_address text check (char_length(quote_address) <= 300),
  add column quote_email text check (char_length(quote_email) <= 200),
  add column quote_phone text check (char_length(quote_phone) <= 50),
  add column quote_bank_account text check (char_length(quote_bank_account) <= 50),
  add column quote_terms text check (char_length(quote_terms) <= 5000),
  add column quote_valid_days integer not null default 30 check (quote_valid_days between 1 and 365);
grant update (quote_address, quote_email, quote_phone, quote_bank_account, quote_terms, quote_valid_days)
  on public.workspaces to authenticated;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  description text check (char_length(description) <= 2000),
  sku text check (char_length(sku) <= 60),
  unit text not null default 'stk' check (char_length(unit) between 1 and 20),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  vat_rate numeric(5,2) not null default 25 check (vat_rate in (0, 12, 15, 25)),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);
create index products_workspace_idx on public.products(workspace_id, active, name);
alter table public.products enable row level security;
create policy products_member on public.products for all to authenticated
  using (private.is_member(workspace_id)) with check (private.is_member(workspace_id));
create trigger products_touch before update on public.products for each row execute function private.touch_updated_at();

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  number integer not null,
  title text not null check (char_length(title) between 1 and 200),
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  deal_id uuid,
  company_id uuid,
  contact_id uuid,
  valid_until date,
  intro text check (char_length(intro) <= 5000),
  terms text check (char_length(terms) <= 5000),
  total_ex_vat numeric(14,2) not null default 0,
  total_vat numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  public_token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  sent_at timestamptz,
  sent_to text,
  viewed_at timestamptz,
  view_count integer not null default 0,
  responded_at timestamptz,
  responder_name text check (char_length(responder_name) <= 200),
  response_comment text check (char_length(response_comment) <= 2000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, number),
  unique (id, workspace_id),
  foreign key (deal_id, workspace_id) references public.deals(id, workspace_id) on delete set null (deal_id),
  foreign key (company_id, workspace_id) references public.companies(id, workspace_id) on delete set null (company_id),
  foreign key (contact_id, workspace_id) references public.contacts(id, workspace_id) on delete set null (contact_id)
);
create index quotes_deal_idx on public.quotes(deal_id);
create index quotes_company_idx on public.quotes(company_id);
create index quotes_contact_idx on public.quotes(contact_id);
create index quotes_created_by_idx on public.quotes(created_by);
alter table public.quotes enable row level security;
create policy quotes_member on public.quotes for all to authenticated
  using (private.is_member(workspace_id)) with check (private.is_member(workspace_id));
create trigger quotes_touch before update on public.quotes for each row execute function private.touch_updated_at();

-- Running quote number per company.
create or replace function private.quote_number() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('quote:' || new.workspace_id::text));
  select coalesce(max(number), 0) + 1 into new.number from public.quotes where workspace_id = new.workspace_id;
  return new;
end; $$;
create trigger quotes_number before insert on public.quotes for each row execute function private.quote_number();

create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  quote_id uuid not null,
  position integer not null default 0,
  product_id uuid,
  description text not null check (char_length(description) between 1 and 500),
  quantity numeric(12,3) not null default 1 check (quantity >= 0),
  unit text not null default 'stk' check (char_length(unit) between 1 and 20),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  vat_rate numeric(5,2) not null default 25 check (vat_rate in (0, 12, 15, 25)),
  foreign key (quote_id, workspace_id) references public.quotes(id, workspace_id) on delete cascade,
  foreign key (product_id, workspace_id) references public.products(id, workspace_id) on delete set null (product_id)
);
create index quote_lines_quote_idx on public.quote_lines(quote_id, position);
create index quote_lines_product_idx on public.quote_lines(product_id);
alter table public.quote_lines enable row level security;
create policy quote_lines_member on public.quote_lines for all to authenticated
  using (private.is_member(workspace_id)) with check (private.is_member(workspace_id));

-- Public view of a sent quote by its secret link. Records the first and later views.
create or replace function public.quote_public(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare q public.quotes; w public.workspaces; result jsonb;
begin
  if p_token is null or char_length(p_token) <> 36 then return null; end if;
  select * into q from public.quotes where public_token = p_token;
  if not found or q.status = 'draft' then return null; end if;
  select * into w from public.workspaces where id = q.workspace_id;
  if w.suspended_at is not null then return null; end if;

  update public.quotes set view_count = view_count + 1, viewed_at = coalesce(viewed_at, now()) where id = q.id;
  if q.viewed_at is null and q.deal_id is not null then
    insert into public.activities (workspace_id, type, body, deal_id, company_id, contact_id)
    values (q.workspace_id, 'note', 'Tilbud #' || q.number || ' ble åpnet av kunden.', q.deal_id, q.company_id, q.contact_id);
  end if;

  select jsonb_build_object(
    'number', q.number, 'title', q.title, 'status', q.status, 'valid_until', q.valid_until,
    'intro', q.intro, 'terms', q.terms, 'sent_at', q.sent_at, 'responded_at', q.responded_at,
    'responder_name', q.responder_name,
    'total_ex_vat', q.total_ex_vat, 'total_vat', q.total_vat, 'total', q.total,
    'seller', jsonb_build_object('name', w.name, 'org_number', w.org_number, 'address', w.quote_address,
      'email', w.quote_email, 'phone', w.quote_phone, 'bank_account', w.quote_bank_account),
    'contact_person', (select jsonb_build_object('name', coalesce(p.full_name, p.email), 'email', p.email)
                       from public.profiles p where p.id = q.created_by),
    'customer', jsonb_build_object(
      'company', (select c.name from public.companies c where c.id = q.company_id),
      'org_number', (select c.org_number from public.companies c where c.id = q.company_id),
      'address', (select concat_ws(', ', c.address, concat_ws(' ', c.postal_code, c.city)) from public.companies c where c.id = q.company_id),
      'contact', (select concat_ws(' ', k.first_name, k.last_name) from public.contacts k where k.id = q.contact_id)),
    'lines', coalesce((select jsonb_agg(jsonb_build_object('description', l.description, 'quantity', l.quantity, 'unit', l.unit,
        'unit_price', l.unit_price, 'discount_percent', l.discount_percent, 'vat_rate', l.vat_rate) order by l.position)
      from public.quote_lines l where l.quote_id = q.id), '[]'::jsonb)
  ) into result;
  return result;
end; $$;
revoke all on function public.quote_public(text) from public;
grant execute on function public.quote_public(text) to anon, authenticated;

-- The customer accepts or declines a sent quote. Returns who to notify.
create or replace function public.quote_respond(p_token text, p_accept boolean, p_name text, p_comment text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare q public.quotes; who text := btrim(coalesce(p_name, ''));
begin
  if p_token is null or char_length(p_token) <> 36 or char_length(who) not between 2 and 200 then
    raise exception 'invalid';
  end if;
  select * into q from public.quotes where public_token = p_token for update;
  if not found or q.status <> 'sent' then raise exception 'not_open'; end if;
  if q.valid_until is not null and q.valid_until < (now() at time zone 'Europe/Oslo')::date then raise exception 'expired'; end if;
  if exists (select 1 from public.workspaces w where w.id = q.workspace_id and w.suspended_at is not null) then raise exception 'not_open'; end if;

  update public.quotes
     set status = case when p_accept then 'accepted' else 'rejected' end,
         responded_at = now(), responder_name = who, response_comment = nullif(left(btrim(coalesce(p_comment, '')), 2000), '')
   where id = q.id;
  if q.deal_id is not null then
    insert into public.activities (workspace_id, type, body, deal_id, company_id, contact_id)
    values (q.workspace_id, 'note',
      'Tilbud #' || q.number || case when p_accept then ' ble akseptert av ' else ' ble avslått av ' end || who || '.'
        || coalesce(E'\n' || nullif(left(btrim(coalesce(p_comment, '')), 2000), ''), ''),
      q.deal_id, q.company_id, q.contact_id);
  end if;
  return jsonb_build_object(
    'number', q.number, 'title', q.title, 'quote_id', q.id, 'deal_id', q.deal_id,
    'workspace', (select w.name from public.workspaces w where w.id = q.workspace_id),
    'notify', coalesce((select jsonb_agg(distinct p.email) from public.profiles p
      where p.id in (q.created_by, (select d.owner_id from public.deals d where d.id = q.deal_id)) and p.email is not null), '[]'::jsonb));
end; $$;
revoke all on function public.quote_respond(text, boolean, text, text) from public;
grant execute on function public.quote_respond(text, boolean, text, text) to anon, authenticated;

-- =============================================================================
-- 3. Automations: when a deal enters a stage, create a follow-up task
-- =============================================================================
create table public.automations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stage_id uuid not null,
  task_title text not null check (char_length(task_title) between 1 and 200),
  due_days integer not null default 0 check (due_days between 0 and 365),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (stage_id, workspace_id) references public.pipeline_stages(id, workspace_id) on delete cascade
);
create index automations_stage_idx on public.automations(workspace_id, stage_id) where active;
create index automations_stage_fk_idx on public.automations(stage_id);
create index automations_created_by_idx on public.automations(created_by);
alter table public.automations enable row level security;
create policy automations_select on public.automations for select to authenticated
  using (private.is_member(workspace_id));
create policy automations_manage on public.automations for all to authenticated
  using (private.has_role(workspace_id, array['owner','admin']::public.member_role[]))
  with check (private.has_role(workspace_id, array['owner','admin']::public.member_role[]));

create or replace function private.run_deal_automations() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.stage_id is not distinct from old.stage_id then return null; end if;
  insert into public.tasks (workspace_id, title, due_at, assignee_id, deal_id, company_id, contact_id)
  select new.workspace_id,
         left(a.task_title || ': ' || new.title, 300),
         (((now() at time zone 'Europe/Oslo')::date + a.due_days) + time '09:00') at time zone 'Europe/Oslo',
         coalesce(new.owner_id, new.created_by),
         new.id, new.company_id, new.contact_id
    from public.automations a
   where a.workspace_id = new.workspace_id and a.stage_id = new.stage_id and a.active;
  return null;
end; $$;
create trigger deals_automations after insert or update of stage_id on public.deals
  for each row execute function private.run_deal_automations();

-- =============================================================================
-- 4. Daily summary e-mail (weekdays 07:00 Oslo)
-- =============================================================================
alter table public.profiles add column digest_email boolean not null default true;
grant update (digest_email) on public.profiles to authenticated;

create table private.digest_tickets (
  token text primary key,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create table private.digest_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  sent_on date not null,
  primary key (user_id, sent_on)
);
alter table private.digest_tickets enable row level security;
alter table private.digest_log enable row level security;

-- Called by pg_cron. Only the database knows the ticket, so only this job can unlock the digest data.
create or replace function private.digest_kick() returns void
language plpgsql security definer set search_path = '' as $$
declare local timestamp := now() at time zone 'Europe/Oslo'; ticket text;
begin
  if extract(hour from local) <> 7 or extract(isodow from local) > 5 then return; end if;
  ticket := encode(extensions.gen_random_bytes(24), 'hex');
  insert into private.digest_tickets (token) values (ticket);
  perform net.http_get(url := 'https://allseats.no/api/cron/digest?ticket=' || ticket, timeout_milliseconds := 55000);
end; $$;

-- Returns today's summary for every user who wants one and has something to do, and marks them as sent.
create or replace function public.digest_claim(p_ticket text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare today date := (now() at time zone 'Europe/Oslo')::date;
        end_of_day timestamptz := ((today + 1)::timestamp) at time zone 'Europe/Oslo';
        result jsonb;
begin
  update private.digest_tickets set used_at = now()
   where token = p_ticket and used_at is null and created_at > now() - interval '15 minutes';
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;

  with people as (
    select p.id, p.email, coalesce(p.full_name, p.email) as name, p.locale
      from public.profiles p
     where p.digest_email and p.email is not null
       and not exists (select 1 from private.digest_log l where l.user_id = p.id and l.sent_on = today)
  ),
  per_ws as (
    select pe.id as user_id, w.id as workspace_id, w.name as workspace,
      (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'due_at', t.due_at) order by t.due_at), '[]'::jsonb)
         from (select t.id, t.title, t.due_at from public.tasks t
                where t.workspace_id = w.id and t.done_at is null and t.due_at < end_of_day
                  and (t.assignee_id = pe.id or exists (select 1 from public.task_members tm where tm.task_id = t.id and tm.user_id = pe.id))
                order by t.due_at limit 15) t) as tasks,
      (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'title', d.title, 'value', d.value) order by d.updated_at), '[]'::jsonb)
         from (select d.id, d.title, d.value, d.updated_at from public.deals d
                 join public.pipeline_stages s on s.id = d.stage_id
                where d.workspace_id = w.id and d.owner_id = pe.id and not s.is_won and not s.is_lost
                  and d.updated_at < now() - interval '14 days'
                order by d.updated_at limit 10) d) as stale,
      (select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'number', q.number, 'title', q.title, 'status', q.status)), '[]'::jsonb)
         from public.quotes q
        where q.workspace_id = w.id and q.created_by = pe.id
          and (q.responded_at > now() - interval '1 day' or (q.status = 'sent' and q.viewed_at > now() - interval '1 day'))) as quotes
    from people pe
    join public.members m on m.user_id = pe.id
    join public.workspaces w on w.id = m.workspace_id and w.suspended_at is null
  ),
  useful as (
    select * from per_ws where jsonb_array_length(tasks) + jsonb_array_length(stale) + jsonb_array_length(quotes) > 0
  ),
  marked as (
    insert into private.digest_log (user_id, sent_on)
    select distinct user_id, today from useful
    on conflict do nothing
    returning user_id
  )
  select coalesce(jsonb_agg(u), '[]'::jsonb) into result
    from (select pe.email, pe.name, pe.locale,
                 jsonb_agg(jsonb_build_object('workspace', x.workspace, 'tasks', x.tasks, 'stale', x.stale, 'quotes', x.quotes)
                           order by x.workspace) as workspaces
            from useful x join people pe on pe.id = x.user_id
           where x.user_id in (select user_id from marked)
           group by pe.email, pe.name, pe.locale) u;
  return result;
end; $$;
revoke all on function public.digest_claim(text) from public;
grant execute on function public.digest_claim(text) to anon;

-- 05:00 and 06:00 UTC: one of them is 07:00 in Oslo (summer/winter time); digest_kick ignores the other.
select cron.schedule('allseats-daily-digest', '0 5,6 * * 1-5', $$ select private.digest_kick() $$);

-- workspaces has column-level SELECT grants
grant select (quote_address, quote_email, quote_phone, quote_bank_account, quote_terms, quote_valid_days) on public.workspaces to authenticated;
