-- A contact no longer needs a first name: the first contact with a company is often just
-- post@firma.no or a phone number. The column stays NOT NULL (empty string when unknown), so
-- existing code that reads first_name as text keeps working.
alter table public.contacts drop constraint if exists contacts_first_name_check;
alter table public.contacts add constraint contacts_first_name_check check (char_length(first_name) <= 100);
alter table public.contacts alter column first_name set default '';
