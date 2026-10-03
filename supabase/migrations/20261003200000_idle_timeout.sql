-- Automatic sign-out after inactivity, per user. 0 = off.
alter table public.profiles
  add column idle_timeout_minutes integer not null default 60
  check (idle_timeout_minutes in (0, 15, 30, 60, 120, 240, 480));

grant update (idle_timeout_minutes) on public.profiles to authenticated;
