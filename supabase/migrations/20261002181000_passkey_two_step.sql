-- A passkey sign-in (device + biometrics/PIN) counts as two-step verification.
-- Supabase marks such sessions with amr method "passkey" (aal stays "aal1").
create or replace function private.is_strong_session()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
      or exists (
        select 1 from jsonb_array_elements(coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)) e
        where e ->> 'method' = 'passkey'
      );
$$;
revoke all on function private.is_strong_session() from public;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.platform_admins a where a.user_id = (select auth.uid()))
     and private.is_strong_session();
$$;

create or replace function public.platform_admin_status()
returns table (is_admin boolean, has_aal2 boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.platform_admins a where a.user_id = (select auth.uid())),
         private.is_strong_session();
$$;
