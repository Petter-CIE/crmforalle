-- Contacts: optional name, and a type (B2B / B2C).

-- 1) A contact no longer needs a first name: the first contact with a company is often just
--    post@firma.no or a phone number. The column stays NOT NULL (empty string when unknown), so
--    existing code that reads first_name as text keeps working.
alter table public.contacts drop constraint if exists contacts_first_name_check;
alter table public.contacts add constraint contacts_first_name_check check (char_length(first_name) <= 100);
alter table public.contacts alter column first_name set default '';

-- 2) Type: 'b2b' (someone at a company) or 'b2c' (private person). Matters for e-mail marketing:
--    private persons need prior consent. When not given it follows the company link.
alter table public.contacts add column if not exists kind text;
update public.contacts set kind = case when company_id is not null then 'b2b' else 'b2c' end where kind is null;
alter table public.contacts alter column kind set not null;
alter table public.contacts drop constraint if exists contacts_kind_check;
alter table public.contacts add constraint contacts_kind_check check (kind in ('b2b', 'b2c'));
create index if not exists contacts_kind_idx on public.contacts (workspace_id, kind);

create or replace function private.contact_default_kind() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.kind is null then
    new.kind := case when new.company_id is not null then 'b2b' else 'b2c' end;
  end if;
  return new;
end; $$;
drop trigger if exists contacts_default_kind on public.contacts;
create trigger contacts_default_kind before insert on public.contacts
  for each row execute function private.contact_default_kind();
