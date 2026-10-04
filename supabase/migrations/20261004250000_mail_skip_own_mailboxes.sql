-- The workspace's own connected mailboxes (main and shared) are never treated as contacts:
-- e-mail is matched only against addresses outside the company.
do $$
declare def text;
begin
  def := pg_get_functiondef('public.mail_apply(text, uuid, jsonb)'::regprocedure);
  def := replace(def,
    $o$select array_agg(lower(p.email)) into v_members
    from public.members mm join public.profiles p on p.id = mm.user_id where mm.workspace_id = c.workspace_id;$o$,
    $n$select array_agg(lower(p.email)) into v_members
    from public.members mm join public.profiles p on p.id = mm.user_id where mm.workspace_id = c.workspace_id;
  v_members := coalesce(v_members, '{}') || coalesce((select array_agg(distinct lower(x.account_email)) from public.mail_connections x
                                                      where x.workspace_id = c.workspace_id and x.account_email is not null), '{}');$n$);
  if position('x.account_email' in def) = 0 then raise exception 'mail_apply patch did not apply'; end if;
  execute def;
end $$;
