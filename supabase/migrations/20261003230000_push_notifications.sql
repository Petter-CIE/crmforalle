-- Web push notifications: device subscriptions, an outbox and a per-minute sender.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 10 and 1000 and endpoint like 'https://%'),
  p256dh text not null check (char_length(p256dh) between 10 and 200),
  auth text not null check (char_length(auth) between 4 and 100),
  user_agent text check (char_length(user_agent) <= 300),
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id) where disabled_at is null;
alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_own_select on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_subscriptions_own_delete on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Register this device for the signed-in user (a device that changes user moves with it).
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, disabled_at = null;
end; $$;
revoke all on function public.push_subscribe(text, text, text, text) from public, anon;
grant execute on function public.push_subscribe(text, text, text, text) to authenticated;

create table private.push_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  url text not null default '/app',
  tag text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index push_outbox_unsent_idx on private.push_outbox(id) where sent_at is null;
alter table private.push_outbox enable row level security;

create or replace function private.push_enqueue(p_users uuid[], p_title text, p_body text, p_url text, p_tag text)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into private.push_outbox (user_id, title, body, url, tag)
  select distinct u, left(coalesce(p_title, 'AllSeats CRM'), 120), left(coalesce(p_body, ''), 300),
         case when p_url like '/app%' then left(p_url, 300) else '/app' end, left(p_tag, 100)
    from unnest(p_users) u
   where u is not null
     and exists (select 1 from public.push_subscriptions s where s.user_id = u and s.disabled_at is null);
  get diagnostics n = row_count;
  return n;
end; $$;
revoke all on function private.push_enqueue(uuid[], text, text, text, text) from public, anon, authenticated;

-- Notify colleagues. Only people who share a company with the caller, never the caller.
create or replace function public.queue_push(p_users uuid[], p_title text, p_body text, p_url text, p_tag text)
returns integer language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'forbidden' using errcode = '42501'; end if;
  return private.push_enqueue(
    array(select u from unnest(p_users) u
           where u <> me
             and exists (select 1 from public.members a join public.members b on b.workspace_id = a.workspace_id
                          where a.user_id = me and b.user_id = u)),
    p_title, p_body, p_url, p_tag);
end; $$;
revoke all on function public.queue_push(uuid[], text, text, text, text) from public, anon;
grant execute on function public.queue_push(uuid[], text, text, text, text) to authenticated;

-- "Send test notification" to all of the caller's own devices.
create or replace function public.queue_test_push(p_title text, p_body text)
returns integer language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'forbidden' using errcode = '42501'; end if;
  return private.push_enqueue(array[(select auth.uid())], p_title, p_body, '/app/konto', 'test');
end; $$;
revoke all on function public.queue_test_push(text, text) from public, anon;
grant execute on function public.queue_test_push(text, text) to authenticated;

-- Sender: pg_cron calls push_kick every minute; it only calls the app when something is waiting.
create table private.push_tickets (
  token text primary key,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
alter table private.push_tickets enable row level security;

create or replace function private.push_kick() returns void
language plpgsql security definer set search_path = '' as $$
declare ticket text;
begin
  if not exists (select 1 from private.push_outbox where sent_at is null) then return; end if;
  ticket := encode(extensions.gen_random_bytes(24), 'hex');
  insert into private.push_tickets (token) values (ticket);
  perform net.http_get(url := 'https://allseats.no/api/cron/push?ticket=' || ticket, timeout_milliseconds := 30000);
end; $$;

-- Hands the waiting notifications (with the devices to send them to) to the app, once per ticket.
create or replace function public.push_claim(p_ticket text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  update private.push_tickets set used_at = now()
   where token = p_ticket and used_at is null and created_at > now() - interval '5 minutes';
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  with batch as (
    update private.push_outbox o set sent_at = now()
     where o.id in (select id from private.push_outbox where sent_at is null order by id limit 300 for update skip locked)
    returning o.user_id, o.title, o.body, o.url, o.tag
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'title', b.title, 'body', b.body, 'url', b.url, 'tag', b.tag,
           'subs', (select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]'::jsonb)
                      from public.push_subscriptions s where s.user_id = b.user_id and s.disabled_at is null))), '[]'::jsonb)
    into result
    from batch b;
  return result;
end; $$;
revoke all on function public.push_claim(text) from public;
grant execute on function public.push_claim(text) to anon;

-- Devices the push service says are gone are switched off.
create or replace function public.push_gone(p_ticket text, p_endpoints text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.push_tickets where token = p_ticket and used_at > now() - interval '5 minutes') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.push_subscriptions set disabled_at = now() where endpoint = any(p_endpoints) and disabled_at is null;
end; $$;
revoke all on function public.push_gone(text, text[]) from public;
grant execute on function public.push_gone(text, text[]) to anon;

select cron.schedule('allseats-push', '* * * * *', $$ select private.push_kick() $$);

-- quote_respond also pushes to the seller and the deal owner (full function in the applied migration "quote_respond_push").

-- Applied as "push_send_immediately": push_enqueue calls private.push_kick() when it queued something,
-- so notifications go out within seconds; the per-minute cron job stays as a fallback.
