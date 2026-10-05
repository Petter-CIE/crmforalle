-- Google Calendar and Gmail forwarding.
-- 1) A user can connect a Google calendar (free/busy only). It is a row in mail_connections with
--    provider 'google' (no mail), synced by the same 15-minute job, and blocks the booking page.
-- 2) Mail auto-forwarded to the company's CRM address (e.g. a Gmail filter that forwards everything)
--    is kept only when it matches a contact or company; the rest is dropped instead of waiting in
--    the "unmatched" list. Hand-forwarded and Bcc mail works as before.

-- 1) Google as a provider ------------------------------------------------------------------------
alter table public.mail_connections drop constraint if exists mail_connections_provider_check;
alter table public.mail_connections add constraint mail_connections_provider_check check (provider in ('microsoft', 'google'));

create or replace function public.mail_claim(p_ticket text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.mail_tickets where token = p_ticket and applied_at is null and created_at > now() - interval '15 minutes') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update private.mail_tickets set applied_at = now() where token = p_ticket;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'provider', c.provider, 'workspace_id', c.workspace_id, 'user_id', c.user_id, 'refresh_token', c.refresh_token,
      'parent_id', c.parent_id, 'mailbox', c.mailbox,
      'mail', c.mail_enabled, 'calendar', c.calendar_enabled, 'synced_until', c.synced_until,
      'user_email', (select lower(email) from public.profiles where id = c.user_id))
      order by c.parent_id nulls first, c.created_at)
      from public.mail_connections c
      join public.workspaces w on w.id = c.workspace_id
     where w.suspended_at is null), '[]'::jsonb);
end; $$;

-- 2) Auto-forwarded mail -------------------------------------------------------------------------
-- A second version with p_auto. It files the mail as usual and removes it again when it matched nothing.
create or replace function public.ingest_inbound_email(
  p_token text, p_message_id text, p_from_email text, p_from_name text,
  p_to text[], p_cc text[], p_forwarded_from text, p_subject text, p_body text, p_sent_at timestamptz,
  p_auto boolean
) returns text language plpgsql security definer set search_path = '' as $$
declare r text;
begin
  r := public.ingest_inbound_email(p_token, p_message_id, p_from_email, p_from_name, p_to, p_cc, p_forwarded_from, p_subject, p_body, p_sent_at);
  if coalesce(p_auto, false) and r = 'unmatched' and p_message_id is not null then
    delete from public.inbound_emails e
     using public.workspaces w
     where w.inbound_token = p_token and e.workspace_id = w.id
       and e.message_id = left(p_message_id, 500) and e.status = 'unmatched';
    return 'skipped';
  end if;
  return r;
end; $$;

revoke all on function public.ingest_inbound_email(text, text, text, text, text[], text[], text, text, text, timestamptz, boolean) from public;
grant execute on function public.ingest_inbound_email(text, text, text, text, text[], text[], text, text, text, timestamptz, boolean) to anon, authenticated;
