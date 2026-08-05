alter function public.get_workspace() rename to get_workspace_v_completion_dates_base;
revoke all on function public.get_workspace_v_completion_dates_base() from public, authenticated;

create function public.get_workspace()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_response jsonb := public.get_workspace_v_completion_dates_base();
  v_child uuid := public.current_child_id();
  v_dates jsonb;
begin
  if v_child is null then raise exception 'family membership required'; end if;

  select coalesce(jsonb_agg(date_key::text order by date_key), '[]'::jsonb)
  into v_dates
  from (
    select date_key
    from public.daily_plans
    where child_id = v_child and bonus_awarded
    union
    select date_key
    from public.point_ledger
    where child_id = v_child
      and delta > 0
      and reason in ('task', 'daily_bonus', 'legacy_daily_earned')
    union
    select date_key
    from public.task_records
    where child_id = v_child and status = 'completed'
  ) dates;

  return jsonb_set(v_response, '{state,completedDates}', v_dates, true);
end;
$$;

revoke all on function public.get_workspace() from public;
grant execute on function public.get_workspace() to authenticated;
