-- Self-service deletion.
-- 1) The owner can ask for the whole company to be deleted. Access closes at once (like a suspension),
--    and a nightly job deletes the company for good 30 days later. Until then the owner can undo it.
-- 2) Any user can delete their own account, unless they still own a company that is not being deleted.

alter table public.workspaces
  add column deletion_requested_at timestamptz,
  add column deletion_requested_by uuid references public.profiles(id) on delete set null,
  add column deletion_scheduled_for timestamptz;
grant select (deletion_requested_at, deletion_scheduled_for) on public.workspaces to authenticated;

-- Self-service deletions are logged next to the admin ones.
alter table private.admin_deletions drop constraint admin_deletions_kind_check;
alter table private.admin_deletions add constraint admin_deletions_kind_check check (kind in ('data', 'workspace', 'self'));

-- Files of deleted companies. Storage can only be emptied through the Storage API, so the paths wait
-- here until a platform admin's session removes them (done automatically when the admin page opens).
create table private.storage_cleanup (
  id bigint generated always as identity primary key,
  bucket text not null,
  path text not null,
  queued_at timestamptz not null default now()
);
alter table private.storage_cleanup enable row level security;

-- Owner asks for deletion. Returns the date the company will be deleted.
create or replace function public.request_workspace_deletion(p_workspace uuid, p_confirm_name text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare w public.workspaces; v_when timestamptz := now() + interval '30 days';
begin
  if not private.has_role(p_workspace, array['owner']::public.member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into w from public.workspaces where id = p_workspace for update;
  if btrim(coalesce(p_confirm_name, '')) <> w.name then
    raise exception 'name_mismatch';
  end if;
  if w.deletion_requested_at is not null then
    return w.deletion_scheduled_for;
  end if;
  -- suspended_at closes the forms, booking pages, quote links and inbound e-mail at once.
  -- It is set to the same timestamp, so undoing the deletion only lifts a suspension it made itself.
  update public.workspaces
     set deletion_requested_at = now(),
         deletion_requested_by = (select auth.uid()),
         deletion_scheduled_for = v_when,
         suspended_at = coalesce(suspended_at, now())
   where id = p_workspace;
  insert into private.admin_audit (admin_id, workspace_id, changes)
  values ((select auth.uid()), p_workspace, jsonb_build_object('deletion_requested', v_when));
  return v_when;
end; $$;
revoke all on function public.request_workspace_deletion(uuid, text) from public, anon;
grant execute on function public.request_workspace_deletion(uuid, text) to authenticated;

-- Owner (or a platform admin) undoes the deletion before it has happened.
create or replace function public.cancel_workspace_deletion(p_workspace uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (private.has_role(p_workspace, array['owner']::public.member_role[]) or private.is_platform_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.workspaces
     set suspended_at = case when suspended_at = deletion_requested_at then null else suspended_at end,
         deletion_requested_at = null,
         deletion_requested_by = null,
         deletion_scheduled_for = null
   where id = p_workspace and deletion_requested_at is not null;
  if found then
    insert into private.admin_audit (admin_id, workspace_id, changes)
    values ((select auth.uid()), p_workspace, jsonb_build_object('deletion_cancelled', true));
  end if;
end; $$;
revoke all on function public.cancel_workspace_deletion(uuid) from public, anon;
grant execute on function public.cancel_workspace_deletion(uuid) to authenticated;

-- Nightly job: one-time ticket, as for the trial mails.
create table private.deletion_tickets (token text primary key, created_at timestamptz not null default now(), used_at timestamptz);
alter table private.deletion_tickets enable row level security;

create or replace function private.deletion_kick() returns void
language plpgsql security definer set search_path = '' as $$
declare ticket text;
begin
  if not exists (select 1 from public.workspaces where deletion_scheduled_for <= now()) then return; end if;
  ticket := encode(extensions.gen_random_bytes(24), 'hex');
  insert into private.deletion_tickets (token) values (ticket);
  perform net.http_get(url := 'https://allseats.no/api/cron/deletions?ticket=' || ticket, timeout_milliseconds := 55000);
end; $$;

-- Deletes every company whose 30 days are up and returns what the app needs afterwards
-- (cancel the card subscription, confirm by e-mail, tell the AllSeats team).
create or replace function public.deletion_claim(p_ticket text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb := '[]'::jsonb; w record;
begin
  update private.deletion_tickets set used_at = now() where token = p_ticket and used_at is null and created_at > now() - interval '15 minutes';
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  for w in
    select * from public.workspaces where deletion_scheduled_for <= now() order by deletion_scheduled_for limit 50 for update skip locked
  loop
    result := result || jsonb_build_array(jsonb_build_object(
      'id', w.id, 'name', w.name, 'org_number', w.org_number, 'plan', w.plan,
      'payment_method', w.payment_method, 'stripe_subscription_id', w.stripe_subscription_id,
      'recipients', (select coalesce(jsonb_agg(jsonb_build_object('email', p.email, 'name', p.full_name)), '[]'::jsonb)
                       from public.members m join public.profiles p on p.id = m.user_id
                      where m.workspace_id = w.id and m.role in ('owner', 'admin') and p.email is not null)));
    insert into private.admin_deletions (kind, admin_id, workspace_id, workspace_name, org_number, plan, member_count, contact_count)
    values ('self', w.deletion_requested_by, w.id, w.name, w.org_number, w.plan::text,
            (select count(*) from public.members m where m.workspace_id = w.id),
            (select count(*) from public.contacts c where c.workspace_id = w.id));
    insert into private.storage_cleanup (bucket, path)
    select o.bucket_id, o.name from storage.objects o
     where o.bucket_id in ('attachments', 'logos') and o.name like w.id::text || '/%';
    delete from public.workspaces where id = w.id;
  end loop;
  return result;
end; $$;
revoke all on function public.deletion_claim(text) from public;
grant execute on function public.deletion_claim(text) to anon, authenticated;

select cron.schedule('allseats-deletions', '40 2 * * *', 'select private.deletion_kick()');

-- Platform admin empties the storage queue (the admin session may delete files in any company).
create or replace function public.admin_storage_cleanup_list()
returns table (id bigint, bucket text, path text) language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select s.id, s.bucket, s.path from private.storage_cleanup s order by s.id limit 1000;
end; $$;
revoke all on function public.admin_storage_cleanup_list() from public, anon;
grant execute on function public.admin_storage_cleanup_list() to authenticated;

create or replace function public.admin_storage_cleanup_done(p_ids bigint[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from private.storage_cleanup where id = any(p_ids);
end; $$;
revoke all on function public.admin_storage_cleanup_done(bigint[]) from public, anon;
grant execute on function public.admin_storage_cleanup_done(bigint[]) to authenticated;

-- A user deletes their own account. Owners must first delete (or hand over) their companies.
-- Everything the user created stays in the companies; references to them are cleared by the foreign keys.
create or replace function public.delete_my_account(p_confirm_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_email text;
begin
  if v_uid is null then raise exception 'forbidden' using errcode = '42501'; end if;
  select email into v_email from auth.users where id = v_uid;
  if lower(btrim(coalesce(p_confirm_email, ''))) <> lower(coalesce(v_email, '')) then
    raise exception 'email_mismatch';
  end if;
  if exists (
    select 1 from public.members m join public.workspaces w on w.id = m.workspace_id
     where m.user_id = v_uid and m.role = 'owner' and w.deletion_requested_at is null
  ) then
    raise exception 'owns_workspace';
  end if;
  delete from auth.users where id = v_uid;
end; $$;
revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
