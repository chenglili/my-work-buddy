update public.task_definitions
set completion_mode = 'auto',
    minimum_score = 0,
    minimum_duration = null,
    requires_parent = false
where id in ('chinese-morning-reading', 'chinese-night-reading', 'english-daily');

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
  v_today date := public.shanghai_today();
  v_completed_date date := timezone('Asia/Shanghai', p_completed_at)::date;
  v_plan public.daily_plans;
  v_task public.task_definitions;
  v_status text;
  v_response jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  if v_child is null then raise exception 'family membership required'; end if;
  if p_completed_at is null or v_completed_date <> p_date_key then raise exception 'completion date does not match task date'; end if;
  if p_completed_at > now() + interval '5 minutes' then raise exception 'completion time is in the future'; end if;
  if p_date_key > v_today or p_date_key < v_today - 6 then raise exception 'offline task is outside the seven day sync window'; end if;

  v_plan := public.ensure_daily_plan(v_child, p_date_key);
  select * into v_task from public.task_definitions where id = p_task_id;
  if v_task.id is null then raise exception 'unknown task'; end if;
  if v_task.completion_mode = 'auto' and coalesce((p_result->>'score')::integer, 0) < coalesce(v_task.minimum_score, 80) then raise exception 'minimum score not reached'; end if;
  if v_task.completion_mode = 'timer' and coalesce((p_result->>'durationSeconds')::integer, 0) < coalesce(v_task.minimum_duration, 0) then raise exception 'minimum duration not reached'; end if;
  v_status := case when v_task.completion_mode = 'parent' then 'pending_review' else 'completed' end;

  insert into public.task_records (child_id, date_key, task_id, status, result, submitted_by, submitted_at, completed_at)
  values (v_child, p_date_key, p_task_id, v_status, coalesce(p_result, '{}'::jsonb), auth.uid(), p_completed_at, case when v_status = 'completed' then p_completed_at end)
  on conflict (child_id, date_key, task_id) do update
  set status = excluded.status,
      result = excluded.result,
      submitted_by = excluded.submitted_by,
      submitted_at = excluded.submitted_at,
      completed_at = excluded.completed_at,
      updated_at = now()
  where public.task_records.status <> 'completed';

  if v_status = 'completed' then
    insert into public.point_ledger (child_id, date_key, delta, reason, source_key, metadata)
    values (v_child, p_date_key, v_task.points, 'task', 'task:' || p_date_key::text || ':' || p_task_id, jsonb_build_object('taskId', p_task_id))
    on conflict (child_id, source_key) do nothing;
    perform public.maybe_award_daily_bonus(v_child, p_date_key);
  end if;

  v_response := public.get_workspace();
  return public.save_command_response(p_command_id, v_response);
end;
$$;

grant execute on function public.submit_task(uuid, date, text, jsonb, timestamptz) to authenticated;
