-- Feedback from users inside the app, and the pilot programme (first 10 companies: 50 % off the
-- first year of a yearly subscription, invoiced only, in return for feedback).

-- 1) Feedback ---------------------------------------------------------------------------------
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null default 'idea' check (kind in ('idea', 'bug', 'other')),
  page text,
  message text not null check (char_length(message) between 3 and 5000),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index feedback_created_idx on public.feedback (created_at desc);
alter table public.feedback enable row level security;
-- Only the platform admin reads feedback; users send it through submit_feedback (works also when
-- the company is read-only after the trial).
create policy feedback_admin_select on public.feedback for select to authenticated using (private.is_platform_admin());
create policy feedback_admin_update on public.feedback for update to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());
grant select, update (handled_at) on public.feedback to authenticated;

create or replace function public.submit_feedback(p_workspace uuid, p_kind text, p_page text, p_message text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not private.is_member(p_workspace) then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(p_kind, '') not in ('idea', 'bug', 'other') or char_length(btrim(coalesce(p_message, ''))) < 3 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if (select count(*) from public.feedback where user_id = (select auth.uid()) and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'rate_limited' using errcode = '22023';
  end if;
  insert into public.feedback (workspace_id, user_id, kind, page, message)
  values (p_workspace, (select auth.uid()), p_kind, left(nullif(btrim(coalesce(p_page, '')), ''), 300), left(btrim(p_message), 5000))
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.submit_feedback(uuid, text, text, text) from public, anon;
grant execute on function public.submit_feedback(uuid, text, text, text) to authenticated;

alter table public.workspaces add column if not exists pilot_at timestamptz;
grant select (pilot_at) on public.workspaces to authenticated;

-- Admin list with company and sender.
create or replace function public.admin_feedback(p_limit integer default 200)
returns table (id uuid, workspace_id uuid, workspace text, sender_email text, sender_name text, kind text, page text,
               message text, handled_at timestamptz, created_at timestamptz, pilot boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select f.id, f.workspace_id, w.name, u.email::text, p.full_name, f.kind, f.page, f.message, f.handled_at, f.created_at, w.pilot_at is not null
    from public.feedback f
    join public.workspaces w on w.id = f.workspace_id
    left join auth.users u on u.id = f.user_id
    left join public.profiles p on p.id = f.user_id
   order by f.created_at desc
   limit least(greatest(coalesce(p_limit, 200), 1), 1000);
end; $$;

-- 2) Pilot programme ----------------------------------------------------------------------------

-- Marks a company as pilot customer: 50 % for the first year, yearly billing by invoice.
-- The discount runs one year from the end of the trial (or from today if the trial is over).
create or replace function public.admin_set_pilot(p_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare w public.workspaces;
begin
  if not private.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into w from public.workspaces where id = p_id for update;
  if not found then raise exception 'not_found' using errcode = '22023'; end if;
  if p_on then
    if w.pilot_at is null and (select count(*) from public.workspaces where pilot_at is not null) >= 10 then
      raise exception 'pilot_full' using errcode = '22023';
    end if;
    update public.workspaces
       set pilot_at = coalesce(pilot_at, now()),
           discount_percent = 50,
           discount_until = (greatest(now(), trial_ends_at) + interval '1 year')::date,
           discount_note = 'Pilotkunde – 50 % første år (årlig, faktura)',
           billing_interval = 'year'
     where id = p_id;
  else
    update public.workspaces
       set pilot_at = null,
           discount_percent = case when discount_note like 'Pilotkunde%' then 0 else discount_percent end,
           discount_until = case when discount_note like 'Pilotkunde%' then null else discount_until end,
           discount_note = case when discount_note like 'Pilotkunde%' then null else discount_note end
     where id = p_id;
  end if;
end; $$;

-- Public: how many of the 10 pilot places are left (shown on the website).
create or replace function public.pilot_spots_left() returns integer
language sql stable security definer set search_path = '' as $$
  select greatest(0, 10 - (select count(*)::integer from public.workspaces where pilot_at is not null));
$$;

-- Admin: pilot status of one company.
create or replace function public.admin_workspace_pilot(p_id uuid) returns timestamptz
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return (select pilot_at from public.workspaces where id = p_id);
end; $$;

revoke all on function public.admin_feedback(integer) from public, anon;
revoke all on function public.admin_set_pilot(uuid, boolean) from public, anon;
revoke all on function public.admin_workspace_pilot(uuid) from public, anon;
revoke all on function public.pilot_spots_left() from public;
grant execute on function public.admin_feedback(integer) to authenticated;
grant execute on function public.admin_set_pilot(uuid, boolean) to authenticated;
grant execute on function public.admin_workspace_pilot(uuid) to authenticated;
grant execute on function public.pilot_spots_left() to anon, authenticated;
