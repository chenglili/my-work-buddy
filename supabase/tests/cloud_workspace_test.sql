begin;
select plan(23);

select is((select count(*) from public.task_definitions), 18::bigint, 'all task rules are seeded');
select is((select count(*) from public.reward_definitions), 3::bigint, 'all reward prices are seeded');
select is((select cost from public.reward_definitions where id = 'reward-snack'), 80, 'snack costs 80 points');
select is((select cost from public.reward_definitions where id = 'reward-cartoon-30'), 100, 'cartoon time costs 100 points');
select is((select cost from public.reward_definitions where id = 'reward-toy'), 250, 'toy costs 250 points');
select is((select completion_mode from public.task_definitions where id = 'english-daily'), 'timer', 'English uses timer completion');
select is((select minimum_duration from public.task_definitions where id = 'english-daily'), 900, 'English requires fifteen effective minutes');
select is((select completion_mode from public.task_definitions where id = 'sport-rope'), 'parent', 'sport requires parent review');

select is(
  public.required_task_ids_for_date(date '2026-08-03'),
  array['chinese-morning-reading', 'math-arithmetic', 'english-daily', 'chinese-night-reading', 'sport-high-jump', 'chinese-reading-comprehension']::text[],
  'Monday plan matches the frontend schedule'
);
select is(
  public.required_task_ids_for_date(date '2026-08-02'),
  array['chinese-morning-reading', 'english-daily', 'chinese-night-reading', 'sport-rope']::text[],
  'Sunday uses the lighter four-task plan'
);

select ok((select relrowsecurity from pg_class where oid = 'public.families'::regclass), 'families has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.task_records'::regclass), 'task records have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.point_ledger'::regclass), 'point ledger has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.reward_requests'::regclass), 'reward requests have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.family_members'::regclass), 'family membership has RLS enabled');

select ok(has_function_privilege('authenticated', 'public.submit_task(uuid,date,text,jsonb)', 'EXECUTE'), 'authenticated devices can submit tasks through the RPC');
select ok(has_function_privilege('authenticated', 'public.create_pair_code(uuid,text)', 'EXECUTE'), 'parents can create idempotent pairing commands');
select ok(has_function_privilege('authenticated', 'public.claim_pair_code(uuid,text,text)', 'EXECUTE'), 'anonymous authenticated devices can claim pairing codes');
select ok(has_function_privilege('authenticated', 'public.revoke_child_device(uuid,uuid)', 'EXECUTE'), 'parents can revoke paired devices through the RPC');
select ok(not has_table_privilege('authenticated', 'public.point_ledger', 'INSERT'), 'clients cannot insert point ledger rows directly');
select ok(not has_table_privilege('authenticated', 'public.task_records', 'UPDATE'), 'clients cannot update task records directly');
select ok(not has_function_privilege('authenticated', 'public.finish_daily_notification(uuid,date,boolean,text)', 'EXECUTE'), 'only the service role can finish notifications');
select ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_records'), 'task records are published to Realtime');

select * from finish();
rollback;
