-- The calendar feed token must not be readable by colleagues (it is the only key to a user's task feed).
-- Supabase grants table-wide SELECT, so a column revoke alone has no effect: select is granted per column
-- instead, without calendar_token. The app gets the user's own link through calendar_link() (security definer).
revoke select on public.profiles from authenticated, anon;
grant select (id, email, full_name, locale, created_at, notify_email, idle_timeout_minutes, digest_email, dashboard, nav, phone)
  on public.profiles to authenticated;
-- New profile columns must be added to this grant to be readable.
