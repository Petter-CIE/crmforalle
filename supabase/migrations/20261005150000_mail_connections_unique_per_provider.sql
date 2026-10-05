-- The same address can be both a Microsoft 365 mailbox and a Google account (e.g. a Google account
-- created on a work address). Make the one-row-per-address rule apply per provider.
drop index if exists public.mail_connections_account_uidx;
create unique index mail_connections_account_uidx on public.mail_connections (workspace_id, user_id, provider, lower(account_email));
