create or replace function public.reset_today_game_completions(p_command_id uuid)
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
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  if v_child is null then raise exception 'family membership required'; end if;

  v_plan := public.ensure_daily_plan(v_child, v_today);

  delete from public.task_records
  where child_id = v_child
    and date_key = v_today
    and content_round = v_plan.content_round
    and task_id in ('game-hanzi', 'game-number', 'game-spot', 'game-logic');

  delete from public.point_ledger
  where child_id = v_child
    and date_key = v_today
    and reason = 'task'
    and (metadata->>'taskId') in ('game-hanzi', 'game-number', 'game-spot', 'game-logic');

  return public.save_command_response(p_command_id, public.get_workspace());
end;
$$;

revoke all on function public.reset_today_game_completions(uuid) from public, authenticated;
grant execute on function public.reset_today_game_completions(uuid) to authenticated;
