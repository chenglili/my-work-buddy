begin;
select plan(59);

select is((select count(*) from public.task_definitions), 18::bigint, 'all task rules are seeded');
select is((select count(*) from public.reward_definitions), 3::bigint, 'all reward prices are seeded');
select is((select cost from public.reward_definitions where id = 'reward-snack'), 80, 'snack costs 80 points');
select is((select cost from public.reward_definitions where id = 'reward-cartoon-30'), 100, 'cartoon time costs 100 points');
select is((select cost from public.reward_definitions where id = 'reward-toy'), 250, 'toy costs 250 points');
select is((select completion_mode from public.task_definitions where id = 'english-daily'), 'auto', 'English uses child-confirmed completion');
select is((select minimum_duration from public.task_definitions where id = 'english-daily'), null::integer, 'English has no timer requirement');
select is((select completion_mode from public.task_definitions where id = 'chinese-morning-reading'), 'auto', 'Chinese morning reading uses direct completion');
select is((select minimum_score from public.task_definitions where id = 'chinese-morning-reading'), 0, 'Chinese morning reading has no score gate');
select is((select minimum_duration from public.task_definitions where id = 'chinese-morning-reading'), null::integer, 'Chinese morning reading has no duration gate');
select is((select completion_mode from public.task_definitions where id = 'chinese-night-reading'), 'auto', 'Chinese night reading uses direct completion');
select is((select minimum_score from public.task_definitions where id = 'chinese-night-reading'), 0, 'Chinese night reading has no score gate');
select is((select minimum_duration from public.task_definitions where id = 'chinese-night-reading'), null::integer, 'Chinese night reading has no duration gate');
select is((select completion_mode from public.task_definitions where id = 'sport-rope'), 'parent', 'sport requires parent review');
select is((select count(*) from public.pet_item_definitions), 4::bigint, 'all pet supplies are seeded');
select is((select cost from public.pet_item_definitions where id = 'parrot-food'), 3, 'parrot food uses the reduced pet price');
select is((select cost from public.pet_item_definitions where id = 'apple-bites'), 4, 'apple bites use the reduced pet price');
select is((select cost from public.pet_item_definitions where id = 'bell-toy'), 20, 'bell toy uses the reduced pet price');
select is((select cost from public.pet_item_definitions where id = 'bath-spray'), 4, 'bath spray uses the reduced pet price');
select is((select satiety_gain from public.pet_item_definitions where id = 'parrot-food'), 14, 'parrot food restores about one day of satiety');
select is((select cleanliness_gain from public.pet_item_definitions where id = 'bath-spray'), 12, 'bath spray restores about two days of cleanliness');
select is((select consumable from public.pet_item_definitions where id = 'bell-toy'), false, 'bell toy is durable');

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
select ok((select relrowsecurity from pg_class where oid = 'public.pet_item_definitions'::regclass), 'pet item definitions have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.pet_profiles'::regclass), 'pet profiles have RLS enabled');

select ok(has_function_privilege('authenticated', 'public.submit_task(uuid,date,text,jsonb,timestamptz)', 'EXECUTE'), 'authenticated devices can submit dated offline tasks through the RPC');
select hasnt_function('public', 'submit_task', array['uuid', 'date', 'text', 'jsonb'], 'the obsolete same-day submit RPC is removed');
select ok(position('p_date_key < v_today - 6' in pg_get_functiondef('public.submit_task(uuid,date,text,jsonb,timestamptz)'::regprocedure)) > 0, 'offline task sync is limited to seven calendar days');
select ok(position('v_completed_date <> p_date_key' in pg_get_functiondef('public.submit_task(uuid,date,text,jsonb,timestamptz)'::regprocedure)) > 0, 'offline completion timestamp must match its task date');
select ok(position('task is not scheduled' in pg_get_functiondef('public.submit_task(uuid,date,text,jsonb,timestamptz)'::regprocedure)) = 0, 'all point earning tasks can be submitted');
select ok(position('optional tasks are locked' in pg_get_functiondef('public.submit_task(uuid,date,text,jsonb,timestamptz)'::regprocedure)) = 0, 'optional point earning tasks are not gated by the daily plan');
select ok(has_function_privilege('authenticated', 'public.create_pair_code(uuid,text)', 'EXECUTE'), 'parents can create idempotent pairing commands');
select ok(has_function_privilege('authenticated', 'public.claim_pair_code(uuid,text,text)', 'EXECUTE'), 'anonymous authenticated devices can claim pairing codes');
select ok(has_function_privilege('authenticated', 'public.create_parent_pair_code(uuid)', 'EXECUTE'), 'parents can create parent device login codes');
select ok(has_function_privilege('authenticated', 'public.claim_parent_pair_code(uuid,text,text)', 'EXECUTE'), 'anonymous devices can claim parent login codes');
select ok(position('extensions' in coalesce(array_to_string((select proconfig from pg_proc where oid = 'public.create_pair_code(uuid,text)'::regprocedure), ','), '')) > 0, 'pair code creation can resolve pgcrypto functions');
select ok(position('extensions' in coalesce(array_to_string((select proconfig from pg_proc where oid = 'public.claim_pair_code(uuid,text,text)'::regprocedure), ','), '')) > 0, 'pair code claiming can resolve pgcrypto functions');
select ok(has_function_privilege('authenticated', 'public.revoke_child_device(uuid,uuid)', 'EXECUTE'), 'parents can revoke paired devices through the RPC');
select ok(has_function_privilege('authenticated', 'public.cancel_reward(uuid,uuid)', 'EXECUTE'), 'child devices can call the guarded reward cancellation RPC');
select ok(has_function_privilege('authenticated', 'public.reject_reward(uuid,uuid)', 'EXECUTE'), 'parents can call the guarded reward rejection RPC');
select ok(has_function_privilege('authenticated', 'public.purchase_pet_item(uuid,text)', 'EXECUTE'), 'authenticated family devices can purchase pet supplies through the RPC');
select ok(has_function_privilege('authenticated', 'public.interact_pet(uuid,text,text)', 'EXECUTE'), 'authenticated family devices can interact with the pet through the RPC');
select has_column('public', 'reward_requests', 'cancelled_at', 'reward requests record cancellation time');
select has_column('public', 'reward_requests', 'rejected_at', 'reward requests record rejection time');
select ok((select pg_get_expr(indpred, indrelid) from pg_index where indexrelid = 'public.reward_requests_active_idx'::regclass) ~ 'pending.*approved', 'only pending and approved requests block another request');
select ok(position('requested_by = auth.uid()' in pg_get_functiondef('public.cancel_reward(uuid,uuid)'::regprocedure)) > 0, 'a child can cancel only a request submitted by the same user');
select ok(position('current_member_role() <> ''parent''' in pg_get_functiondef('public.reject_reward(uuid,uuid)'::regprocedure)) > 0, 'reward rejection is restricted to the parent role');
select ok(not has_table_privilege('authenticated', 'public.point_ledger', 'INSERT'), 'clients cannot insert point ledger rows directly');
select ok(not has_table_privilege('authenticated', 'public.task_records', 'UPDATE'), 'clients cannot update task records directly');
select ok(not has_table_privilege('authenticated', 'public.pet_profiles', 'UPDATE'), 'clients cannot update pet profiles directly');
select ok(position('pet_purchase' in pg_get_constraintdef((select oid from pg_constraint where conname = 'point_ledger_reason_check'))) > 0, 'point ledger accepts the pet purchase reason');
select ok(position('{state,pet}' in pg_get_functiondef('public.get_workspace()'::regprocedure)) > 0, 'workspace payload includes the pet profile');
select ok(not has_function_privilege('authenticated', 'public.finish_daily_notification(uuid,date,boolean,text)', 'EXECUTE'), 'only the service role can finish notifications');
select ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_records'), 'task records are published to Realtime');
select ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pet_profiles'), 'pet profiles are published to Realtime');

select * from finish();
rollback;
