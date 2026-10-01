-- Phase 1: tenants (workspaces), profiles, members, invitations
-- Applied to project crmforalle (eu-central-1) on 2026-10-01.

create type public.member_role as enum ('owner', 'admin', 'user');
create type public.plan_type as enum ('trial', 'start', 'bedrift');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  locale text not null default 'nb',
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  org_number text check (org_number ~ '^[0-9]{9}$'),
  plan public.plan_type not null default 'trial',
  contact_limit integer not null default 2000,
  stripe_customer_id text,
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'user',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index members_user_id_idx on public.members(user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role public.member_role not null default 'user' check (role <> 'owner'),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);
create index invitations_workspace_id_idx on public.invitations(workspace_id);
create index invitations_invited_by_idx on public.invitations(invited_by);
create index workspaces_created_by_idx on public.workspaces(created_by);
create unique index invitations_open_unique on public.invitations(workspace_id, lower(email)) where accepted_at is null;

-- Helper functions (security definer so RLS policies can call them without recursion).
-- Moved to schema "private" by the next migration.
create or replace function public.is_member(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.workspace_id = ws and m.user_id = (select auth.uid()));
$$;

create or replace function public.has_role(ws uuid, roles public.member_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.workspace_id = ws and m.user_id = (select auth.uid()) and m.role = any(roles));
$$;

-- New auth user -> profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create a workspace and make the caller its owner
create or replace function public.create_workspace(p_name text, p_org_number text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ws uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.workspaces (name, org_number, created_by)
  values (trim(p_name), nullif(regexp_replace(coalesce(p_org_number, ''), '\s', '', 'g'), ''), v_uid)
  returning id into v_ws;
  insert into public.members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  return v_ws;
end;
$$;

-- Accept an invitation (email must match the logged-in user)
create or replace function public.accept_invitation(p_token uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_inv public.invitations%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select email into v_email from auth.users where id = v_uid;
  select * into v_inv from public.invitations
    where token = p_token and accepted_at is null and expires_at > now()
    for update;
  if not found then raise exception 'invitation not found or expired'; end if;
  if lower(v_inv.email) <> lower(v_email) then raise exception 'invitation is for another email'; end if;
  insert into public.members (workspace_id, user_id, role)
    values (v_inv.workspace_id, v_uid, v_inv.role)
    on conflict (workspace_id, user_id) do nothing;
  update public.invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.workspace_id;
end;
$$;

revoke execute on function public.create_workspace(text, text) from public, anon;
revoke execute on function public.accept_invitation(uuid) from public, anon;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.has_role(uuid, public.member_role[]) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.create_workspace(text, text) to authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.member_role[]) to authenticated;

-- Row level security
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.members enable row level security;
alter table public.invitations enable row level security;

-- profiles: see yourself and colleagues; edit only yourself
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.members me join public.members other on other.workspace_id = me.workspace_id
      where me.user_id = (select auth.uid()) and other.user_id = profiles.id
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces: members read; owner/admin update name/org number
create policy workspaces_select on public.workspaces for select to authenticated
  using (public.is_member(id));
create policy workspaces_update on public.workspaces for update to authenticated
  using (public.has_role(id, array['owner','admin']::public.member_role[]))
  with check (public.has_role(id, array['owner','admin']::public.member_role[]));

-- members: members read; owner/admin manage non-owner rows; anyone (non-owner) can leave
create policy members_select on public.members for select to authenticated
  using (public.is_member(workspace_id));
create policy members_update on public.members for update to authenticated
  using (role <> 'owner' and public.has_role(workspace_id, array['owner','admin']::public.member_role[]))
  with check (role <> 'owner' and public.has_role(workspace_id, array['owner','admin']::public.member_role[]));
create policy members_delete on public.members for delete to authenticated
  using (
    role <> 'owner' and (
      user_id = (select auth.uid())
      or public.has_role(workspace_id, array['owner','admin']::public.member_role[])
    )
  );

-- invitations: owner/admin manage
create policy invitations_select on public.invitations for select to authenticated
  using (public.has_role(workspace_id, array['owner','admin']::public.member_role[]));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (public.has_role(workspace_id, array['owner','admin']::public.member_role[]) and invited_by = (select auth.uid()));
create policy invitations_delete on public.invitations for delete to authenticated
  using (public.has_role(workspace_id, array['owner','admin']::public.member_role[]));

-- Billing fields can only be changed by the backend (service role), not by users
revoke update on public.workspaces from authenticated;
grant update (name, org_number) on public.workspaces to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, locale) on public.profiles to authenticated;
revoke update on public.members from authenticated;
grant update (role) on public.members to authenticated;
