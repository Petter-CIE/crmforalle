-- Each user's own main menu: order of the sections and which ones are hidden.
-- {"order": ["today", "sales", …], "hidden": ["quotes", …]}; null = the default menu.
alter table public.profiles add column if not exists nav jsonb;
grant select (nav), update (nav) on public.profiles to authenticated;
