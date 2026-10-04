-- Shared mailboxes (Microsoft 365): read through the user's own connection when the user has
-- Full Access to them. A shared mailbox is a child row of the connection, with its own address,
-- project and sync point; it has no token of its own.

alter table public.mail_connections add column if not exists parent_id uuid references public.mail_connections(id) on delete cascade;
alter table public.mail_connections add column if not exists mailbox text;
grant select (parent_id, mailbox), insert (parent_id, mailbox) on public.mail_connections to authenticated;

create or replace function public.mail_claim(p_ticket text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.mail_tickets where token = p_ticket and applied_at is null and created_at > now() - interval '15 minutes') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update private.mail_tickets set applied_at = now() where token = p_ticket;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'workspace_id', c.workspace_id, 'user_id', c.user_id, 'refresh_token', c.refresh_token,
      'parent_id', c.parent_id, 'mailbox', c.mailbox,
      'mail', c.mail_enabled, 'calendar', c.calendar_enabled, 'synced_until', c.synced_until,
      'user_email', (select lower(email) from public.profiles where id = c.user_id))
      order by c.parent_id nulls first, c.created_at)
      from public.mail_connections c
      join public.workspaces w on w.id = c.workspace_id
     where w.suspended_at is null), '[]'::jsonb);
end; $$;
