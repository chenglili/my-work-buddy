create function public.backfill_recent_checkins(p_start date, p_end date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child uuid := public.current_child_id();
  v_today date := public.shanghai_today();
  v_date date;
begin
  if public.current_member_role() <> 'parent' then raise exception 'parent role required'; end if;
  if v_child is null then raise exception 'family membership required'; end if;
  if p_start is null or p_end is null or p_start > p_end or p_end >= v_today or p_end - p_start > 2 then
    raise exception 'invalid recent check-in range';
  end if;

  v_date := p_start;
  while v_date <= p_end loop
    perform public.ensure_daily_plan(v_child, v_date);
    update public.daily_plans
      set bonus_awarded = true
      where child_id = v_child and date_key = v_date;
    v_date := v_date + 1;
  end loop;

  return public.get_workspace();
end;
$$;

revoke all on function public.backfill_recent_checkins(date, date) from public;
grant execute on function public.backfill_recent_checkins(date, date) to authenticated;
