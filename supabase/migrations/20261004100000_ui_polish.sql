-- UI polish: dashboard layout per user, time-in-stage for deals, workspace logo.

-- 1) Dashboard layout (list of widgets with size), chosen by each user.
alter table public.profiles add column if not exists dashboard jsonb;
grant select (dashboard), update (dashboard) on public.profiles to authenticated;

-- 2) When a deal entered its current stage.
alter table public.deals add column if not exists stage_changed_at timestamptz not null default now();
update public.deals d
   set stage_changed_at = coalesce(
     (select max(a.occurred_at) from public.activities a where a.deal_id = d.id and a.type in ('stage_change', 'won', 'lost')),
     d.created_at);

create or replace function private.touch_stage_changed()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.stage_id is distinct from old.stage_id then
    new.stage_changed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists deals_stage_changed on public.deals;
create trigger deals_stage_changed before update of stage_id on public.deals
  for each row execute function private.touch_stage_changed();

-- 3) Company logo (shown in the menu, on quotes and on the public quote page).
alter table public.workspaces add column if not exists logo_path text;
grant select (logo_path), update (logo_path) on public.workspaces to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create or replace function private.is_admin_folder(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when (storage.foldername(p_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.has_role(((storage.foldername(p_name))[1])::uuid, array['owner', 'admin']::public.member_role[])
    else false
  end;
$$;

create policy logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and private.is_admin_folder(name));
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and private.is_admin_folder(name));
create policy logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and private.is_admin_folder(name));

-- 4) quote_public also returns the seller's logo_path (seller.logo_path). Full function body applied as migration "quote_public_logo".

-- 5) Platform admins may list and delete logos (cleanup when a company is deleted).
create policy logos_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'logos' and private.is_platform_admin());
create policy logos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and private.is_platform_admin());
