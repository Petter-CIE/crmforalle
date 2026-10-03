-- Mail where everyone is a colleague (or our own address) has no customer to file it on: skip it.
create or replace function public.ingest_inbound_email(
  p_token text, p_message_id text, p_from_email text, p_from_name text,
  p_to text[], p_cc text[], p_forwarded_from text, p_subject text, p_body text, p_sent_at timestamptz
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_ws uuid;
  v_id uuid;
  v_members text[];
  v_author uuid;
  v_from text := lower(trim(p_from_email));
  v_all text[];
  v_ext text[];
begin
  if p_token !~ '^[a-z0-9]{10}$' then return 'unknown'; end if;
  select id into v_ws from public.workspaces where inbound_token = p_token and suspended_at is null;
  if v_ws is null then return 'unknown'; end if;
  if (select count(*) from public.inbound_emails where workspace_id = v_ws and created_at > now() - interval '1 day') >= 1000 then
    return 'limited';
  end if;
  if p_message_id is not null and exists (select 1 from public.inbound_emails where workspace_id = v_ws and message_id = left(p_message_id, 500)) then
    return 'duplicate';
  end if;

  select array_agg(lower(p.email)) into v_members
  from public.members m join public.profiles p on p.id = m.user_id where m.workspace_id = v_ws;
  select m.user_id into v_author
  from public.members m join public.profiles p on p.id = m.user_id
  where m.workspace_id = v_ws and lower(p.email) = v_from;

  select coalesce(array_agg(distinct a), '{}') into v_ext
  from unnest(array[v_from] || coalesce(p_to, '{}') || coalesce(p_cc, '{}')) as x(raw), lower(trim(raw)) a
  where a ~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' and a <> all (coalesce(v_members, '{}')) and a !~ '@allseats\.no$';
  if cardinality(v_ext) = 0 and p_forwarded_from is not null then
    v_all := array[lower(trim(p_forwarded_from))];
    select coalesce(array_agg(a), '{}') into v_ext from unnest(v_all) a
    where a ~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' and a <> all (coalesce(v_members, '{}')) and a !~ '@allseats\.no$';
  end if;
  if cardinality(v_ext) = 0 then return 'internal'; end if;

  insert into public.inbound_emails (workspace_id, message_id, from_email, from_name, to_emails, cc_emails, external_emails,
                                     subject, body, sent_at, author_id)
  values (v_ws, left(p_message_id, 500), left(v_from, 320), left(p_from_name, 200),
          (coalesce(p_to, '{}'))[1:50], (coalesce(p_cc, '{}'))[1:50], v_ext[1:50],
          left(p_subject, 500), left(p_body, 20000), coalesce(p_sent_at, now()), v_author)
  returning id into v_id;

  if private.link_inbound(v_id) > 0 then return 'linked'; end if;
  return 'unmatched';
end; $$;
