-- B2C: private persons need their own address and a record of marketing consent (GDPR).
alter table public.contacts
  add column address text,
  add column postal_code text,
  add column city text,
  add column marketing_consent boolean not null default false,
  add column marketing_consent_at timestamptz;

-- The consent timestamp is set by the database, never by the client.
create or replace function private.stamp_marketing_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.marketing_consent is distinct from old.marketing_consent then
    new.marketing_consent_at := case when new.marketing_consent then now() else null end;
  else
    new.marketing_consent_at := old.marketing_consent_at;
  end if;
  return new;
end;
$$;

create trigger contacts_stamp_consent before insert or update on public.contacts
  for each row execute function private.stamp_marketing_consent();
