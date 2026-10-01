-- Keep RLS helper functions out of the exposed API schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
alter function public.is_member(uuid) set schema private;
alter function public.has_role(uuid, public.member_role[]) set schema private;
