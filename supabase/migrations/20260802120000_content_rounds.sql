-- Each content refresh starts a new practice round. Task points are unique per
-- child, natural date, task, and round; historical rounds remain auditable.

alter table public.daily_plans
  add column if not exists content_date_key date,
  add column if not exists content_round integer not null default 0;

update public.daily_plans
   set content_date_key = coalesce(content_date_key, date_key)
 where content_date_key is null;

alter table public.daily_plans
  alter column content_date_key drop not null;

alter table public.task_records
  add column if not exists content_date_key date,
  add column if not exists content_round integer not null default 0;

update public.task_records
   set content_date_key = coalesce(content_date_key, date_key)
 where content_date_key is null;

alter table public.task_records
  alter column content_date_key drop not null;

alter table public.daily_plans
  drop constraint if exists daily_plans_child_id_date_key_key;
alter table public.task_records
  drop constraint if exists task_records_child_id_date_key_task_id_key;

create unique index if not exists daily_plans_child_date_idx
  on public.daily_plans (child_id, date_key);
create unique index if not exists task_records_child_date_task_round_idx
  on public.task_records (child_id, date_key, task_id, content_round);

create or replace function public.ensure_daily_plan(p_child_id uuid, p_date date)
returns public.daily_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.daily_plans;
  v_previous_day_completed boolean := false;
  v_required_task_ids text[];
begin
  select coalesce(dp.bonus_awarded, false)
    into v_previous_day_completed
    from public.daily_plans dp
   where dp.child_id = p_child_id
     and dp.date_key = p_date - 1;

  v_required_task_ids := public.required_task_ids_for_date_with_history(p_date, v_previous_day_completed);

  insert into public.daily_plans (child_id, date_key, required_task_ids, content_date_key, content_round)
  values (p_child_id, p_date, v_required_task_ids, p_date, 0)
  on conflict (child_id, date_key) do update
    set required_task_ids = case
      when extract(dow from p_date) = 0
       and v_previous_day_completed
       and daily_plans.required_task_ids <> excluded.required_task_ids
        then excluded.required_task_ids
      else daily_plans.required_task_ids
    end;

  select * into v_plan from public.daily_plans where child_id = p_child_id and date_key = p_date;
  return v_plan;
end;
$$;

create or replace function public.maybe_award_daily_bonus(p_child_id uuid, p_date date)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.daily_plans;
  v_awarded boolean := false;
begin
  v_plan := public.ensure_daily_plan(p_child_id, p_date);
  if not v_plan.bonus_awarded and not exists (
    select 1 from unnest(v_plan.required_task_ids) as required(required_id)
    where not exists (
      select 1 from public.task_records tr
       where tr.child_id = p_child_id
         and tr.date_key = p_date
         and tr.content_round = v_plan.content_round
         and tr.task_id = required.required_id
         and tr.status = 'completed'
    )
  ) then
    update public.daily_plans set bonus_awarded = true where id = v_plan.id and bonus_awarded = false returning true into v_awarded;
    if v_awarded then
      insert into public.point_ledger (child_id, date_key, delta, reason, source_key)
      values (p_child_id, p_date, 15, 'daily_bonus', 'daily-bonus:' || p_date::text)
      on conflict (child_id, source_key) do nothing;
    end if;
  end if;
  return coalesce(v_awarded, false);
end;
$$;

create or replace function public.get_workspace()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid := public.current_family_id();
  v_child uuid := public.current_child_id();
  v_today date := public.shanghai_today();
  v_plan public.daily_plans;
  v_state jsonb;
  v_profile public.pet_profiles;
  v_pet jsonb;
  v_response jsonb;
begin
  if v_family is null or v_child is null then raise exception 'family membership required'; end if;
  v_plan := public.ensure_daily_plan(v_child, v_today);

  v_state := jsonb_build_object(
    'dateKey', v_today::text,
    'contentDateKey', coalesce(v_plan.content_date_key, v_today)::text,
    'contentRound', v_plan.content_round,
    'points', public.point_balance(v_child),
    'completedTaskIds', coalesce((select jsonb_agg(task_id order by task_id) from public.task_records where child_id = v_child and date_key = v_today and content_round = v_plan.content_round and status = 'completed'), '[]'::jsonb),
    'bonusAwarded', v_plan.bonus_awarded,
    'completedDates', coalesce((select jsonb_agg(date_key::text order by date_key) from public.daily_plans where child_id = v_child and bonus_awarded), '[]'::jsonb),
    'taskResults', coalesce((select jsonb_agg(jsonb_build_object('durationSeconds', coalesce((result->>'durationSeconds')::integer, 0), 'attempts', coalesce((result->>'attempts')::integer, 1), 'wrongQuestions', coalesce(result->'wrongQuestions', '[]'::jsonb), 'contentRound', content_round) || result || jsonb_build_object('taskId', task_id, 'dateKey', date_key::text, 'completedAt', completed_at) order by completed_at) from public.task_records where child_id = v_child and status = 'completed'), '[]'::jsonb),
    'masteredQuestionKeys', coalesce((select jsonb_agg(key order by key) from (select distinct jsonb_array_elements_text(coalesce(result->'correctQuestions', '[]'::jsonb)) key from public.task_records where child_id = v_child and status = 'completed') mastered), '[]'::jsonb),
    'pendingTaskReviews', coalesce((select jsonb_agg(jsonb_build_object('id', tr.id::text, 'taskId', tr.task_id, 'taskTitle', td.title, 'points', td.points, 'dateKey', tr.date_key::text, 'contentRound', tr.content_round, 'result', tr.result, 'submittedAt', tr.submitted_at) order by tr.submitted_at) from public.task_records tr join public.task_definitions td on td.id = tr.task_id where tr.child_id = v_child and tr.date_key = v_today and tr.content_round = v_plan.content_round and tr.status = 'pending_review'), '[]'::jsonb),
    'weeklyPoints', coalesce((select jsonb_object_agg(week_key, points) from (select (date_key - (extract(isodow from date_key)::integer - 1))::text week_key, sum(delta)::integer points from public.point_ledger where child_id = v_child and reason in ('task', 'daily_bonus', 'legacy_daily_earned') group by 1) weeks), '{}'::jsonb),
    'dailyEarnedPoints', coalesce((select jsonb_object_agg(date_key::text, points) from (select date_key, sum(delta)::integer points from public.point_ledger where child_id = v_child and reason in ('task', 'daily_bonus', 'legacy_daily_earned') group by date_key) days), '{}'::jsonb),
    'rewardRequests', coalesce((select jsonb_agg(jsonb_build_object('id', coalesce(legacy_id, id::text), 'rewardId', reward_id, 'rewardName', reward_name, 'cost', cost, 'status', status, 'requestedAt', requested_at, 'approvedAt', approved_at, 'fulfilledAt', fulfilled_at) order by requested_at desc) from public.reward_requests where child_id = v_child), '[]'::jsonb),
    'notifiedDailyReadyDates', coalesce((select jsonb_agg(date_key::text order by date_key) from public.notification_events where child_id = v_child and event_type = 'daily-ready' and status = 'sent'), '[]'::jsonb)
  );

  v_profile := public.refresh_pet_profile(v_child);
  v_pet := jsonb_build_object(
    'name', v_profile.name,
    'satiety', v_profile.satiety,
    'happiness', v_profile.happiness,
    'cleanliness', v_profile.cleanliness,
    'inventory', v_profile.inventory,
    'ownedToys', to_jsonb(v_profile.owned_toys),
    'lastAction', v_profile.last_action,
    'lastMessage', v_profile.last_message,
    'lastRefreshedDate', v_profile.last_refreshed_date::text
  );
  v_response := jsonb_build_object(
    'state', v_state,
    'role', public.current_member_role(),
    'familyId', v_family,
    'childId', v_child,
    'legacyImported', (select legacy_imported_at is not null from public.families where id = v_family),
    'devices', case when public.current_member_role() = 'parent' then coalesce((select jsonb_agg(jsonb_build_object('userId', user_id, 'name', coalesce(device_name, '孩子设备'), 'createdAt', created_at) order by created_at) from public.family_members where family_id = v_family and role = 'child_device' and revoked_at is null), '[]'::jsonb) else '[]'::jsonb end
  );
  return jsonb_set(v_response, '{state,pet}', v_pet, true);
end;
$$;

create or replace function public.start_content_round(
  p_command_id uuid,
  p_content_date_key date
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cached jsonb;
  v_child uuid := public.current_child_id();
  v_today date := public.shanghai_today();
  v_plan public.daily_plans;
  v_response jsonb;
begin
  if v_child is null then raise exception 'family membership required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;

  v_plan := public.ensure_daily_plan(v_child, v_today);
  update public.daily_plans
     set content_round = content_round + 1,
         content_date_key = coalesce(p_content_date_key, content_date_key)
   where id = v_plan.id;

  v_response := public.get_workspace();
  return public.save_command_response(p_command_id, v_response);
end;
$$;

create or replace function public.submit_task(
  p_command_id uuid,
  p_date_key date,
  p_task_id text,
  p_result jsonb default '{}'::jsonb,
  p_completed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cached jsonb;
  v_child uuid := public.current_child_id();
  v_completed_date date := timezone('Asia/Shanghai', p_completed_at)::date;
  v_plan public.daily_plans;
  v_task public.task_definitions;
  v_round integer := greatest(coalesce((p_result->>'contentRound')::integer, 0), 0);
  v_content_date date := coalesce((p_result->>'contentDateKey')::date, p_date_key);
  v_status text;
  v_source_key text;
  v_response jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  if v_child is null then raise exception 'family membership required'; end if;
  if p_completed_at is null or v_completed_date <> p_date_key then raise exception 'completion date does not match task date'; end if;
  if p_completed_at > now() + interval '5 minutes' then raise exception 'completion time is in the future'; end if;

  v_plan := public.ensure_daily_plan(v_child, p_date_key);
  if p_date_key = public.shanghai_today() and v_round > v_plan.content_round then
    update public.daily_plans set content_round = v_round, content_date_key = v_content_date where id = v_plan.id;
    select * into v_plan from public.daily_plans where id = v_plan.id;
  end if;
  if p_date_key = public.shanghai_today() and v_round <> v_plan.content_round then raise exception 'content round is no longer current'; end if;

  select * into v_task from public.task_definitions where id = p_task_id;
  if v_task.id is null then raise exception 'unknown task'; end if;
  if v_task.completion_mode = 'auto' and coalesce((p_result->>'score')::integer, 0) < coalesce(v_task.minimum_score, 80) then raise exception 'minimum score not reached'; end if;
  if v_task.completion_mode = 'timer' and coalesce((p_result->>'durationSeconds')::integer, 0) < coalesce(v_task.minimum_duration, 0) then raise exception 'minimum duration not reached'; end if;
  v_status := case when v_task.completion_mode = 'parent' then 'pending_review' else 'completed' end;
  v_source_key := case when v_round = 0 then 'task:' || p_date_key::text || ':' || p_task_id else 'task:' || p_date_key::text || ':' || p_task_id || ':' || v_round::text end;

  insert into public.task_records (child_id, date_key, task_id, content_date_key, content_round, status, result, submitted_by, submitted_at, completed_at)
  values (v_child, p_date_key, p_task_id, v_content_date, v_round, v_status, coalesce(p_result, '{}'::jsonb), auth.uid(), p_completed_at, case when v_status = 'completed' then p_completed_at end)
  on conflict (child_id, date_key, task_id, content_round) do update
  set status = excluded.status, result = excluded.result, submitted_by = excluded.submitted_by,
      submitted_at = excluded.submitted_at, completed_at = excluded.completed_at, updated_at = now()
  where public.task_records.status <> 'completed';

  if v_status = 'completed' then
    insert into public.point_ledger (child_id, date_key, delta, reason, source_key, metadata)
    values (v_child, p_date_key, v_task.points, 'task', v_source_key, jsonb_build_object('taskId', p_task_id, 'contentRound', v_round))
    on conflict (child_id, source_key) do nothing;
    perform public.maybe_award_daily_bonus(v_child, p_date_key);
  end if;

  v_response := public.get_workspace();
  return public.save_command_response(p_command_id, v_response);
end;
$$;

create or replace function public.review_task(p_command_id uuid, p_review_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cached jsonb;
  v_child uuid := public.current_child_id();
  v_record public.task_records;
  v_points integer;
  v_source_key text;
  v_response jsonb;
begin
  if public.current_member_role() <> 'parent' then raise exception 'parent role required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  if p_action not in ('approve', 'reject') then raise exception 'invalid review action'; end if;
  select * into v_record from public.task_records where id = p_review_id and child_id = v_child and status = 'pending_review' for update;
  if v_record.id is null then raise exception 'pending review not found'; end if;

  if p_action = 'reject' then
    update public.task_records set status = 'rejected', updated_at = now() where id = v_record.id;
  else
    update public.task_records set status = 'completed', completed_at = now(), updated_at = now() where id = v_record.id;
    select points into v_points from public.task_definitions where id = v_record.task_id;
    v_source_key := case when v_record.content_round = 0 then 'task:' || v_record.date_key::text || ':' || v_record.task_id else 'task:' || v_record.date_key::text || ':' || v_record.task_id || ':' || v_record.content_round::text end;
    insert into public.point_ledger (child_id, date_key, delta, reason, source_key, metadata)
    values (v_child, v_record.date_key, v_points, 'task', v_source_key, jsonb_build_object('taskId', v_record.task_id, 'contentRound', v_record.content_round))
    on conflict (child_id, source_key) do nothing;
    perform public.maybe_award_daily_bonus(v_child, v_record.date_key);
  end if;

  v_response := public.get_workspace();
  return public.save_command_response(p_command_id, v_response);
end;
$$;

create or replace function public.review_all(p_command_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cached jsonb;
  v_child uuid := public.current_child_id();
  v_today date := public.shanghai_today();
  v_plan public.daily_plans;
  v_record record;
  v_source_key text;
  v_response jsonb;
begin
  if public.current_member_role() <> 'parent' then raise exception 'parent role required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  v_plan := public.ensure_daily_plan(v_child, v_today);
  for v_record in
    select tr.id, tr.task_id, tr.date_key, tr.content_round, td.points
      from public.task_records tr join public.task_definitions td on td.id = tr.task_id
     where tr.child_id = v_child and tr.date_key = v_today and tr.content_round = v_plan.content_round and tr.status = 'pending_review'
     for update of tr
  loop
    update public.task_records set status = 'completed', completed_at = now(), updated_at = now() where id = v_record.id;
    v_source_key := case when v_record.content_round = 0 then 'task:' || v_record.date_key::text || ':' || v_record.task_id else 'task:' || v_record.date_key::text || ':' || v_record.task_id || ':' || v_record.content_round::text end;
    insert into public.point_ledger (child_id, date_key, delta, reason, source_key, metadata)
    values (v_child, v_today, v_record.points, 'task', v_source_key, jsonb_build_object('taskId', v_record.task_id, 'contentRound', v_record.content_round))
    on conflict (child_id, source_key) do nothing;
  end loop;
  perform public.maybe_award_daily_bonus(v_child, v_today);
  v_response := public.get_workspace();
  return public.save_command_response(p_command_id, v_response);
end;
$$;

create or replace function public.import_legacy_workspace(p_command_id uuid, p_legacy jsonb, p_import_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family uuid := public.current_family_id();
  v_child uuid := public.current_child_id();
  v_today date := public.shanghai_today();
  v_item jsonb;
  v_date date;
  v_task_id text;
  v_status text;
  v_cost integer;
  v_balance integer;
  v_target integer := coalesce((p_legacy->>'points')::integer, 0);
  v_response jsonb;
begin
  if public.current_member_role() <> 'parent' then raise exception 'parent role required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('points:' || v_child::text, 0));
  if p_import_hash is null or p_import_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid import fingerprint'; end if;
  if (select legacy_imported_at is not null from public.families where id = v_family) then return public.get_workspace(); end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_legacy->'taskResults', '[]'::jsonb)) loop
    v_task_id := v_item->>'taskId';
    v_date := (v_item->>'dateKey')::date;
    if exists (select 1 from public.task_definitions where id = v_task_id) then
      perform public.ensure_daily_plan(v_child, v_date);
      insert into public.task_records (child_id, date_key, task_id, content_date_key, content_round, status, result, submitted_by, submitted_at, completed_at)
      values (v_child, v_date, v_task_id, coalesce((v_item->>'contentDateKey')::date, v_date), coalesce((v_item->>'contentRound')::integer, 0), 'completed', v_item - 'taskId' - 'dateKey' - 'completedAt', auth.uid(), coalesce((v_item->>'completedAt')::timestamptz, now()), coalesce((v_item->>'completedAt')::timestamptz, now()))
      on conflict do nothing;
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_legacy->'pendingTaskReviews', '[]'::jsonb)) loop
    v_task_id := v_item->>'taskId';
    v_date := (v_item->>'dateKey')::date;
    if exists (select 1 from public.task_definitions where id = v_task_id) then
      perform public.ensure_daily_plan(v_child, v_date);
      insert into public.task_records (child_id, date_key, task_id, content_date_key, content_round, status, result, submitted_by, submitted_at)
      values (v_child, v_date, v_task_id, coalesce((v_item->>'contentDateKey')::date, v_date), coalesce((v_item->>'contentRound')::integer, 0), 'pending_review', coalesce(v_item->'result', '{}'::jsonb), auth.uid(), coalesce((v_item->>'submittedAt')::timestamptz, now()))
      on conflict do nothing;
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_legacy->'completedTaskIds', '[]'::jsonb)) loop
    v_task_id := trim(both '"' from v_item::text);
    if exists (select 1 from public.task_definitions where id = v_task_id) then
      perform public.ensure_daily_plan(v_child, v_today);
      insert into public.task_records (child_id, date_key, task_id, content_date_key, content_round, status, result, submitted_by, completed_at)
      values (v_child, v_today, v_task_id, v_today, 0, 'completed', '{}'::jsonb, auth.uid(), now())
      on conflict do nothing;
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_legacy->'completedDates', '[]'::jsonb)) loop
    v_date := trim(both '"' from v_item::text)::date;
    perform public.ensure_daily_plan(v_child, v_date);
    update public.daily_plans set bonus_awarded = true where child_id = v_child and date_key = v_date;
  end loop;
  if coalesce((p_legacy->>'bonusAwarded')::boolean, false) then
    perform public.ensure_daily_plan(v_child, v_today);
    update public.daily_plans set bonus_awarded = true where child_id = v_child and date_key = v_today;
  end if;

  insert into public.point_ledger (child_id, date_key, delta, reason, source_key)
  select v_child, key::date, value::text::integer, 'legacy_daily_earned', 'legacy-earned:' || key
  from jsonb_each(coalesce(p_legacy->'dailyEarnedPoints', '{}'::jsonb))
  where value::text::integer <> 0
  on conflict (child_id, source_key) do nothing;

  for v_item in select value from jsonb_array_elements(coalesce(p_legacy->'rewardRequests', '[]'::jsonb)) loop
    v_status := coalesce(v_item->>'status', 'pending');
    v_cost := coalesce((v_item->>'cost')::integer, 0);
    insert into public.reward_requests (child_id, reward_id, reward_name, cost, status, requested_by, legacy_id, requested_at, approved_at, fulfilled_at)
    values (v_child, v_item->>'rewardId', v_item->>'rewardName', v_cost, v_status, auth.uid(), v_item->>'id', coalesce((v_item->>'requestedAt')::timestamptz, now()), (v_item->>'approvedAt')::timestamptz, (v_item->>'fulfilledAt')::timestamptz)
    on conflict (child_id, legacy_id) where legacy_id is not null do nothing;
    if v_status in ('approved', 'fulfilled') and v_cost > 0 then
      insert into public.point_ledger (child_id, date_key, delta, reason, source_key)
      values (v_child, coalesce(timezone('Asia/Shanghai', (v_item->>'approvedAt')::timestamptz)::date, v_today), -v_cost, 'reward', 'legacy-reward:' || (v_item->>'id'))
      on conflict (child_id, source_key) do nothing;
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_legacy->'notifiedDailyReadyDates', '[]'::jsonb)) loop
    v_date := trim(both '"' from v_item::text)::date;
    insert into public.notification_events (child_id, date_key, status, sent_at)
    values (v_child, v_date, 'sent', now())
    on conflict (child_id, date_key, event_type) do nothing;
  end loop;

  v_balance := public.point_balance(v_child);
  if v_balance <> v_target then
    insert into public.point_ledger (child_id, date_key, delta, reason, source_key, metadata)
    values (v_child, v_today, v_target - v_balance, 'legacy_balance_adjustment', 'legacy-balance', jsonb_build_object('target', v_target));
  end if;
  update public.families set legacy_imported_at = now(), legacy_import_hash = p_import_hash where id = v_family;
  v_response := public.get_workspace();
  return public.save_command_response(p_command_id, v_response);
end;
$$;

grant execute on function public.start_content_round(uuid, date) to authenticated;
grant execute on function public.submit_task(uuid, date, text, jsonb, timestamptz) to authenticated;
