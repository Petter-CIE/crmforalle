-- Tenant isolation test: signs in (inside the database) as a member of company A and tries to read,
-- change, delete and add data of company B in every table that has a workspace_id, plus the
-- workspaces/members/profiles tables and the attachments bucket.
-- Everything runs in one transaction that is always rolled back, so no data changes.
-- Result: the script ends with an error whose message is the report ("ISOLATION OK …" or "ISOLATION FAIL …").
-- Usage: replace the three ids below, run the whole file as the postgres role (Supabase SQL editor or MCP).

begin;

create temp table _iso_cfg as select
  'df921bed-7841-4b25-885d-178d1fedc8e9'::uuid as user_a,   -- member of company A only
  '378d9917-1d87-4881-875f-92ae9b4308e8'::uuid as ws_a,
  '19e44919-eed9-4c0c-831d-076ee6431064'::uuid as ws_b;     -- the other company

-- one real row of company B per table, to try inserting a copy as user A
create temp table _iso_samples (tbl text primary key, sample jsonb);
do $$
declare r record; v jsonb; b uuid := (select ws_b from _iso_cfg);
begin
  for r in
    select c.table_name from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'workspace_id' and t.table_type = 'BASE TABLE'
  loop
    execute format('select to_jsonb(x) from public.%I x where workspace_id = $1 limit 1', r.table_name) into v using b;
    insert into _iso_samples values (r.table_name, v);
  end loop;
end $$;
grant select on _iso_cfg, _iso_samples to authenticated;

select set_config('request.jwt.claims', json_build_object('sub', (select user_a from _iso_cfg), 'role', 'authenticated', 'aal', 'aal1')::text, true);
set local role authenticated;

do $$
declare
  b uuid := (select ws_b from _iso_cfg);
  r record; n bigint; fails text[] := '{}'; checked int := 0; skipped text[] := '{}';
begin
  for r in select tbl, sample from _iso_samples order by tbl loop
    checked := checked + 1;
    -- read
    begin
      execute format('select count(*) from public.%I where workspace_id = $1', r.tbl) into n using b;
      if n > 0 then fails := fails || format('%s: READ %s rows', r.tbl, n); end if;
    exception when insufficient_privilege then null; end;
    -- update
    begin
      execute format('update public.%I set workspace_id = workspace_id where workspace_id = $1', r.tbl) using b;
      get diagnostics n = row_count;
      if n > 0 then fails := fails || format('%s: UPDATE %s rows', r.tbl, n); end if;
    exception when insufficient_privilege then null; end;
    -- delete
    begin
      execute format('delete from public.%I where workspace_id = $1', r.tbl) using b;
      get diagnostics n = row_count;
      if n > 0 then fails := fails || format('%s: DELETE %s rows', r.tbl, n); end if;
    exception when insufficient_privilege then null; end;
    -- insert a copy of a company-B row
    if r.sample is null then
      skipped := skipped || r.tbl;
    else
      begin
        execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', r.tbl, r.tbl) using r.sample;
        fails := fails || format('%s: INSERT into company B succeeded', r.tbl);
      exception
        when insufficient_privilege then null;           -- RLS or no grant: blocked, as it should be
        when others then
          if sqlerrm not ilike '%row-level security%' and sqlstate not in ('42501') then
            -- blocked by something else (trigger, constraint): not a leak, but note it
            skipped := skipped || format('%s(insert:%s)', r.tbl, sqlstate);
          end if;
      end;
    end if;
  end loop;

  -- tables keyed differently
  select count(*) into n from public.workspaces where id = b;
  if n > 0 then fails := fails || 'workspaces: READ company B'; end if;
  select count(*) into n from public.members where workspace_id = b;
  if n > 0 then fails := fails || 'members: READ company B'; end if;
  select count(*) into n from public.profiles p
   where p.id <> (select user_a from _iso_cfg)
     and not exists (select 1 from public.members m where m.user_id = p.id and m.workspace_id = (select ws_a from _iso_cfg));
  if n > 0 then fails := fails || format('profiles: READ %s people outside own company', n); end if;
  begin
    select count(*) into n from storage.objects where bucket_id = 'attachments' and name like b::text || '/%';
    if n > 0 then fails := fails || format('storage attachments: READ %s files', n); end if;
  exception when insufficient_privilege then
    skipped := skipped || format('storage(%s)', sqlerrm);
  end;

  if cardinality(fails) > 0 then
    raise exception 'ISOLATION FAIL (% tables): %', checked, array_to_string(fails, ' | ');
  end if;
  raise exception 'ISOLATION OK: % tables + workspaces/members/profiles/storage. Not insert-tested (no sample row or other block): %',
    checked, coalesce(nullif(array_to_string(skipped, ', '), ''), 'none');
end $$;

rollback;
