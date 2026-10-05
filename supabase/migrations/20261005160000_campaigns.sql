-- E-mail campaigns (newsletters) to contacts.
--
-- * Owners and admins create a campaign, pick the audience (type, project, owner) and send.
-- * Who can receive: contacts with an e-mail that have not unsubscribed. Private customers (B2C) only
--   with marketing consent (markedsføringsloven § 15). Companies marked bankrupt/deleted are skipped.
--   Each address gets the campaign once.
-- * Monthly quota per plan: trial 100, Start 500, Bedrift 5 000 (sent or queued this calendar month).
-- * The app sends through Brevo in batches: pg_cron kicks /api/cron/campaigns every 2 minutes while
--   anything is queued; the app claims a batch (capped by the daily limit of the Brevo account),
--   sends, and reports back. A sent e-mail is logged on the contact's timeline.
-- * Every e-mail has an unsubscribe link (also as List-Unsubscribe one-click). Unsubscribing marks
--   the contact and keeps the address on a per-company suppression list, so a re-import can't undo it.

-- 1) Unsubscribe ---------------------------------------------------------------------------------
alter table public.contacts add column if not exists unsubscribed_at timestamptz;

create table if not exists private.campaign_suppressions (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, email)
);
alter table private.campaign_suppressions enable row level security;

-- 2) Tables --------------------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  subject text not null default '' check (char_length(subject) <= 200),
  body text not null default '' check (char_length(body) <= 20000),
  audience jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'queued', 'sent', 'cancelled')),
  recipients integer not null default 0,
  sent integer not null default 0,
  failed integer not null default 0,
  opened integer not null default 0,
  unsubscribed integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  queued_at timestamptz,
  finished_at timestamptz
);
create index campaigns_ws_idx on public.campaigns (workspace_id, created_at desc);
alter table public.campaigns enable row level security;
create policy campaigns_managers on public.campaigns for all to authenticated
  using (private.has_role(workspace_id, array['owner', 'admin']::public.member_role[]))
  with check (private.has_role(workspace_id, array['owner', 'admin']::public.member_role[]));
create policy campaigns_writable_ins on public.campaigns as restrictive for insert to authenticated with check (private.workspace_writable(workspace_id));
create policy campaigns_writable_upd on public.campaigns as restrictive for update to authenticated using (private.workspace_writable(workspace_id));
grant select, delete on public.campaigns to authenticated;
grant insert (workspace_id, name, subject, body, audience, created_by) on public.campaigns to authenticated;
grant update (name, subject, body, audience, updated_at) on public.campaigns to authenticated;
-- Only drafts can be edited or deleted from the app; sending goes through campaign_send().
create policy campaigns_draft_upd on public.campaigns as restrictive for update to authenticated using (status = 'draft');
create policy campaigns_draft_del on public.campaigns as restrictive for delete to authenticated using (status in ('draft', 'cancelled'));

create table public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  email text not null,
  first_name text,
  last_name text,
  company_name text,
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  error text,
  claimed_at timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, email)
);
create index campaign_recipients_queue_idx on public.campaign_recipients (status, created_at) where status in ('queued', 'sending');
create index campaign_recipients_ws_month_idx on public.campaign_recipients (workspace_id, created_at);
create index campaign_recipients_sent_idx on public.campaign_recipients (sent_at) where sent_at is not null;
alter table public.campaign_recipients enable row level security;
create policy campaign_recipients_managers on public.campaign_recipients for select to authenticated
  using (private.has_role(workspace_id, array['owner', 'admin']::public.member_role[]));
grant select on public.campaign_recipients to authenticated;

-- 3) Audience and quota --------------------------------------------------------------------------
create or replace function private.campaign_quota(ws uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select case w.plan when 'bedrift' then 5000 when 'start' then 500 when 'free' then 500 else 100 end
    from public.workspaces w where w.id = ws;
$$;

create or replace function private.campaign_month_used(ws uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.campaign_recipients r
   where r.workspace_id = ws and r.status in ('queued', 'sending', 'sent')
     and r.created_at >= date_trunc('month', now() at time zone 'Europe/Oslo') at time zone 'Europe/Oslo';
$$;

-- The contacts a campaign goes to. audience: {"kind": "b2b"|"b2c", "project_id": uuid, "owner_id": uuid, "consent_only": bool}
create or replace function private.campaign_audience(ws uuid, a jsonb)
returns table (contact_id uuid, email text, first_name text, last_name text, company_name text)
language sql stable security definer set search_path = '' as $$
  select distinct on (lower(btrim(c.email))) c.id, lower(btrim(c.email)), c.first_name, c.last_name, co.name
    from public.contacts c
    left join public.companies co on co.id = c.company_id
   where c.workspace_id = ws
     and c.email ~ '^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$'
     and c.unsubscribed_at is null
     and not exists (select 1 from private.campaign_suppressions s where s.workspace_id = ws and s.email = lower(btrim(c.email)))
     and (coalesce(c.kind, 'b2b') = 'b2b' or c.marketing_consent is true)
     and (co.id is null or co.brreg_status is null)
     and (nullif(a->>'kind', '') is null or coalesce(c.kind, 'b2b') = a->>'kind')
     and (nullif(a->>'owner_id', '') is null or c.owner_id::text = a->>'owner_id')
     and (coalesce((a->>'consent_only')::boolean, false) is false or c.marketing_consent is true)
     and (nullif(a->>'project_id', '') is null
          or exists (select 1 from public.project_contacts pc where pc.contact_id = c.id and pc.project_id::text = a->>'project_id')
          or exists (select 1 from public.project_companies pk where pk.company_id = c.company_id and pk.project_id::text = a->>'project_id'))
   order by lower(btrim(c.email)), c.created_at;
$$;

-- Numbers for the editor: how many would receive it, and what is left of this month's quota.
create or replace function public.campaign_preview(p_workspace uuid, p_audience jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_role(p_workspace, array['owner', 'admin']::public.member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'count', (select count(*) from private.campaign_audience(p_workspace, coalesce(p_audience, '{}'::jsonb))),
    'quota', private.campaign_quota(p_workspace),
    'used', private.campaign_month_used(p_workspace));
end; $$;

-- Queues a draft for sending. Returns {ok, count} or {error: 'empty'|'quota'|'not_draft'|'incomplete'|'read_only'}.
create or replace function public.campaign_send(p_campaign uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c public.campaigns;
  n integer;
  left_ integer;
begin
  select * into c from public.campaigns where id = p_campaign for update;
  if not found or not private.has_role(c.workspace_id, array['owner', 'admin']::public.member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if c.status <> 'draft' then return jsonb_build_object('error', 'not_draft'); end if;
  if not private.workspace_writable(c.workspace_id)
     or exists (select 1 from public.workspaces w where w.id = c.workspace_id and w.suspended_at is not null) then
    return jsonb_build_object('error', 'read_only');
  end if;
  if btrim(c.subject) = '' or btrim(c.body) = '' then return jsonb_build_object('error', 'incomplete'); end if;

  select count(*) into n from private.campaign_audience(c.workspace_id, c.audience);
  if n = 0 then return jsonb_build_object('error', 'empty'); end if;
  left_ := private.campaign_quota(c.workspace_id) - private.campaign_month_used(c.workspace_id);
  if n > left_ then return jsonb_build_object('error', 'quota', 'count', n, 'left', greatest(left_, 0)); end if;

  insert into public.campaign_recipients (campaign_id, workspace_id, contact_id, email, first_name, last_name, company_name)
  select c.id, c.workspace_id, x.contact_id, x.email, x.first_name, x.last_name, x.company_name
    from private.campaign_audience(c.workspace_id, c.audience) x
  on conflict (campaign_id, email) do nothing;
  get diagnostics n = row_count;

  update public.campaigns set status = 'queued', recipients = n, queued_at = now(), updated_at = now() where id = c.id;
  perform private.campaign_kick();
  return jsonb_build_object('ok', true, 'count', n);
end; $$;

-- Stops a campaign: whatever has not gone out yet is skipped.
create or replace function public.campaign_cancel(p_campaign uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare ws uuid;
begin
  select workspace_id into ws from public.campaigns where id = p_campaign;
  if ws is null or not private.has_role(ws, array['owner', 'admin']::public.member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.campaign_recipients set status = 'skipped' where campaign_id = p_campaign and status = 'queued';
  update public.campaigns set status = case when sent > 0 then 'sent' else 'cancelled' end, finished_at = now(), updated_at = now()
   where id = p_campaign and status = 'queued';
end; $$;

-- 4) Background sending (ticket pattern, like the other jobs) --------------------------------------
create table if not exists private.campaign_tickets (token text primary key, created_at timestamptz not null default now(), applied_at timestamptz);
alter table private.campaign_tickets enable row level security;

create or replace function private.campaign_kick() returns void
language plpgsql security definer set search_path = '' as $$
declare ticket text;
begin
  if not exists (select 1 from public.campaign_recipients where status in ('queued', 'sending')) then return; end if;
  ticket := encode(extensions.gen_random_bytes(24), 'hex');
  insert into private.campaign_tickets (token) values (ticket);
  perform net.http_get(url := 'https://allseats.no/api/cron/campaigns?ticket=' || ticket, timeout_milliseconds := 55000);
end; $$;

-- Hands out the next batch, at most p_limit and never more than p_daily_cap e-mails per day in total
-- (the Brevo account's limit). Claimed rows that were never reported back are retried after 15 minutes.
create or replace function public.campaign_claim(p_ticket text, p_limit integer, p_daily_cap integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  room integer;
  out jsonb;
begin
  if not exists (select 1 from private.campaign_tickets where token = p_ticket and applied_at is null and created_at > now() - interval '15 minutes') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update private.campaign_tickets set applied_at = now() where token = p_ticket;
  update public.campaign_recipients set status = 'queued', claimed_at = null
   where status = 'sending' and claimed_at < now() - interval '15 minutes';

  room := least(greatest(p_limit, 0), greatest(p_daily_cap, 0) - (
    select count(*)::integer from public.campaign_recipients
     where sent_at >= date_trunc('day', now() at time zone 'Europe/Oslo') at time zone 'Europe/Oslo'
        or (status = 'sending')));
  if room <= 0 then return '[]'::jsonb; end if;

  with picked as (
    select r.id from public.campaign_recipients r
      join public.campaigns c on c.id = r.campaign_id
     where r.status = 'queued' and c.status = 'queued'
     order by c.queued_at, r.created_at
     limit room
     for update of r skip locked
  ), upd as (
    update public.campaign_recipients r set status = 'sending', claimed_at = now()
      from picked where r.id = picked.id
    returning r.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id, 'email', u.email, 'first_name', u.first_name, 'last_name', u.last_name, 'company_name', u.company_name,
      'token', u.token, 'campaign_id', c.id, 'subject', c.subject, 'body', c.body,
      'workspace_name', w.name, 'workspace_address', w.quote_address,
      'reply_to', (select p.email from public.profiles p where p.id = c.created_by),
      'reply_name', (select p.full_name from public.profiles p where p.id = c.created_by))), '[]'::jsonb)
    into out
    from upd u
    join public.campaigns c on c.id = u.campaign_id
    join public.workspaces w on w.id = c.workspace_id;
  return out;
end; $$;

-- Results for a batch: [{id, ok, error}]. Sent e-mails are logged on the contact's timeline.
create or replace function public.campaign_report(p_ticket text, p_results jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  x jsonb;
  rec public.campaign_recipients;
  camp public.campaigns;
  n integer := 0;
begin
  if not exists (select 1 from private.campaign_tickets where token = p_ticket and created_at > now() - interval '15 minutes') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  for x in select * from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) limit 500 loop
    update public.campaign_recipients
       set status = case when (x->>'ok')::boolean then 'sent' else 'failed' end,
           sent_at = case when (x->>'ok')::boolean then now() end,
           error = case when (x->>'ok')::boolean then null else left(x->>'error', 300) end
     where id = (x->>'id')::uuid and status = 'sending'
    returning * into rec;
    if not found then continue; end if;
    n := n + 1;
    select * into camp from public.campaigns where id = rec.campaign_id;
    if rec.status = 'sent' then
      update public.campaigns set sent = sent + 1 where id = camp.id;
      if rec.contact_id is not null then
        insert into public.activities (workspace_id, type, body, contact_id, company_id, author_id, occurred_at)
        select camp.workspace_id, 'email_sent', 'Kampanje: ' || camp.subject, ct.id, ct.company_id, camp.created_by, now()
          from public.contacts ct where ct.id = rec.contact_id;
      end if;
    else
      update public.campaigns set failed = failed + 1 where id = camp.id;
    end if;
  end loop;
  -- Campaigns with nothing left to send are done.
  update public.campaigns cc set status = 'sent', finished_at = now()
   where cc.status = 'queued'
     and not exists (select 1 from public.campaign_recipients rr where rr.campaign_id = cc.id and rr.status in ('queued', 'sending'));
  return n;
end; $$;

-- 5) Opens and unsubscribes (public, by the token in each e-mail) ----------------------------------
create or replace function public.campaign_open(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  if p_token !~ '^[0-9a-f]{36}$' then return; end if;
  update public.campaign_recipients set opened_at = now() where token = p_token and opened_at is null returning campaign_id into cid;
  if cid is not null then update public.campaigns set opened = opened + 1 where id = cid; end if;
end; $$;

create or replace function public.campaign_unsubscribe_info(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('company', w.name, 'email', r.email, 'done', r.unsubscribed_at is not null)
    from public.campaign_recipients r join public.workspaces w on w.id = r.workspace_id
   where p_token ~ '^[0-9a-f]{36}$' and r.token = p_token;
$$;

create or replace function public.campaign_unsubscribe(p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare r public.campaign_recipients;
begin
  if p_token !~ '^[0-9a-f]{36}$' then return false; end if;
  select * into r from public.campaign_recipients where token = p_token;
  if not found then return false; end if;
  if r.unsubscribed_at is null then
    update public.campaign_recipients set unsubscribed_at = now() where id = r.id;
    update public.campaigns set unsubscribed = unsubscribed + 1 where id = r.campaign_id;
  end if;
  insert into private.campaign_suppressions (workspace_id, email) values (r.workspace_id, lower(r.email)) on conflict do nothing;
  update public.contacts set unsubscribed_at = coalesce(unsubscribed_at, now())
   where workspace_id = r.workspace_id and lower(btrim(email)) = lower(r.email);
  return true;
end; $$;

-- 6) Grants and schedule -------------------------------------------------------------------------
revoke all on function public.campaign_preview(uuid, jsonb) from public;
revoke all on function public.campaign_send(uuid) from public;
revoke all on function public.campaign_cancel(uuid) from public;
revoke all on function public.campaign_claim(text, integer, integer) from public;
revoke all on function public.campaign_report(text, jsonb) from public;
revoke all on function public.campaign_open(text) from public;
revoke all on function public.campaign_unsubscribe_info(text) from public;
revoke all on function public.campaign_unsubscribe(text) from public;
grant execute on function public.campaign_preview(uuid, jsonb) to authenticated;
grant execute on function public.campaign_send(uuid) to authenticated;
grant execute on function public.campaign_cancel(uuid) to authenticated;
grant execute on function public.campaign_claim(text, integer, integer) to anon, authenticated;
grant execute on function public.campaign_report(text, jsonb) to anon, authenticated;
grant execute on function public.campaign_open(text) to anon, authenticated;
grant execute on function public.campaign_unsubscribe_info(text) to anon, authenticated;
grant execute on function public.campaign_unsubscribe(text) to anon, authenticated;

select cron.schedule('allseats-campaigns', '*/2 * * * *', 'select private.campaign_kick()');
