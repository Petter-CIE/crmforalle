-- Self-service subscription order (paid by invoice),
-- trial reminder e-mails, and a personal calendar feed (iCal) for tasks.

-- 1) Order details on the workspace -------------------------------------------------------
alter table public.workspaces
  add column if not exists invoice_email text check (char_length(invoice_email) <= 200),
  add column if not exists invoice_reference text check (char_length(invoice_reference) <= 100),
  add column if not exists ordered_at timestamptz,
  add column if not exists ordered_by uuid references public.profiles(id) on delete set null;
grant select (invoice_email, invoice_reference, ordered_at, ordered_by) on public.workspaces to authenticated;

-- Owner/admin chooses Start or Bedrift. Takes effect at once; CIE AS sends the invoice.
create or replace function public.order_subscription(
  p_workspace uuid, p_plan public.plan_type, p_interval text, p_addon boolean, p_invoice_email text, p_reference text)
returns void language plpgsql security definer set search_path = '' as $$
declare w public.workspaces; v_limit integer; v_count integer;
begin
  if not private.has_role(p_workspace, array['owner','admin']::public.member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_plan not in ('start', 'bedrift') or p_interval not in ('month', 'year') then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if coalesce(p_invoice_email, '') !~ '^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  select * into w from public.workspaces where id = p_workspace for update;
  v_limit := case when w.plan = p_plan then w.contact_limit when p_plan = 'start' then 2000 else 25000 end;
  if v_limit > 0 then
    select (select count(*) from public.companies where workspace_id = p_workspace)
         + (select count(*) from public.contacts where workspace_id = p_workspace) into v_count;
    if v_count > v_limit + coalesce(w.extra_contact_packs, 0) * (case when p_plan = 'start' then 2000 else 25000 end) then
      raise exception 'too_many_contacts' using errcode = '22023';
    end if;
  end if;
  update public.workspaces
     set plan = p_plan,
         billing_interval = p_interval,
         accounting_addon = (p_plan = 'start' and coalesce(p_addon, false)),
         contact_limit = v_limit,
         invoice_email = lower(btrim(p_invoice_email)),
         invoice_reference = nullif(left(btrim(coalesce(p_reference, '')), 100), ''),
         ordered_at = now(),
         ordered_by = (select auth.uid())
   where id = p_workspace;
end; $$;
revoke all on function public.order_subscription(uuid, public.plan_type, text, boolean, text, text) from public;
grant execute on function public.order_subscription(uuid, public.plan_type, text, boolean, text, text) to authenticated;

-- 3) Trial reminder e-mails (3 days before and the day after it ends) ----------------------
create table private.trial_tickets (token text primary key, created_at timestamptz not null default now(), used_at timestamptz);
alter table private.trial_tickets enable row level security;
create table private.trial_mail_log (workspace_id uuid not null, kind text not null, sent_at timestamptz not null default now(), primary key (workspace_id, kind));
alter table private.trial_mail_log enable row level security;

create or replace function private.trial_kick() returns void
language plpgsql security definer set search_path = '' as $$
declare local timestamp := now() at time zone 'Europe/Oslo'; ticket text;
begin
  if extract(hour from local) <> 8 then return; end if;
  ticket := encode(extensions.gen_random_bytes(24), 'hex');
  insert into private.trial_tickets (token) values (ticket);
  perform net.http_get(url := 'https://allseats.no/api/cron/trial?ticket=' || ticket, timeout_milliseconds := 55000);
end; $$;

create or replace function public.trial_claim(p_ticket text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  update private.trial_tickets set used_at = now() where token = p_ticket and used_at is null and created_at > now() - interval '15 minutes';
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  with due as (
    select w.id, w.name, w.trial_ends_at,
           case when w.trial_ends_at > now() then 'ending' else 'ended' end as kind
      from public.workspaces w
     where w.plan = 'trial' and w.suspended_at is null
       and ((w.trial_ends_at > now() and w.trial_ends_at <= now() + interval '3 days')
         or (w.trial_ends_at <= now() and w.trial_ends_at > now() - interval '3 days'))
  ),
  fresh as (
    insert into private.trial_mail_log (workspace_id, kind)
    select id, kind from due on conflict do nothing
    returning workspace_id, kind
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'kind', d.kind, 'workspace', d.name, 'ends_at', d.trial_ends_at,
      'recipients', (select coalesce(jsonb_agg(jsonb_build_object('email', p.email, 'name', coalesce(p.full_name, p.email), 'locale', p.locale)), '[]'::jsonb)
                       from public.members m join public.profiles p on p.id = m.user_id
                      where m.workspace_id = d.id and m.role in ('owner', 'admin')))), '[]'::jsonb)
    into result
    from due d join fresh f on f.workspace_id = d.id and f.kind = d.kind;
  return result;
end; $$;
revoke all on function public.trial_claim(text) from public;
grant execute on function public.trial_claim(text) to anon, authenticated;

select cron.schedule('allseats-trial-mails', '0 6,7 * * *', 'select private.trial_kick()');

-- 4) Personal calendar feed --------------------------------------------------------------
alter table public.profiles add column if not exists calendar_token text unique;
-- No select grant on calendar_token: colleagues can read profiles, so the token is only handed out via the functions below.

create or replace function public.calendar_link(p_rotate boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  if (select auth.uid()) is null then raise exception 'forbidden' using errcode = '42501'; end if;
  select calendar_token into v from public.profiles where id = (select auth.uid());
  if v is null or p_rotate then
    v := encode(extensions.gen_random_bytes(20), 'hex');
    update public.profiles set calendar_token = v where id = (select auth.uid());
  end if;
  return v;
end; $$;
revoke all on function public.calendar_link(boolean) from public;
grant execute on function public.calendar_link(boolean) to authenticated;

-- The user's open tasks (assigned or collaborating) in all companies, for the .ics feed.
create or replace function public.calendar_feed(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{40}$' then return null; end if;
  select id into v_user from public.profiles where calendar_token = p_token;
  if v_user is null then return null; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', t.id, 'title', t.title, 'description', t.description, 'due_at', t.due_at, 'done', t.done_at is not null,
      'updated_at', t.updated_at, 'workspace', w.name,
      'related', coalesce(d.title, c.name, nullif(concat_ws(' ', k.first_name, k.last_name), ''))) order by t.due_at)
    from public.tasks t
    join public.workspaces w on w.id = t.workspace_id and w.suspended_at is null
    join public.members m on m.workspace_id = t.workspace_id and m.user_id = v_user
    left join public.deals d on d.id = t.deal_id
    left join public.companies c on c.id = t.company_id
    left join public.contacts k on k.id = t.contact_id
   where t.due_at is not null
     and t.due_at > now() - interval '60 days' and t.due_at < now() + interval '400 days'
     and (t.assignee_id = v_user or exists (select 1 from public.task_members tm where tm.task_id = t.id and tm.user_id = v_user))), '[]'::jsonb);
end; $$;
revoke all on function public.calendar_feed(text) from public;
grant execute on function public.calendar_feed(text) to anon, authenticated;
