alter function public.get_workspace() rename to get_workspace_v_point_records_base;
revoke all on function public.get_workspace_v_point_records_base() from public, authenticated;

create function public.get_workspace()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_response jsonb := public.get_workspace_v_point_records_base();
  v_child uuid := public.current_child_id();
  v_records jsonb;
begin
  if v_child is null then raise exception 'family membership required'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', pl.id::text,
    'dateKey', pl.date_key::text,
    'delta', pl.delta,
    'reason', pl.reason,
    'sourceKey', pl.source_key,
    'sourceId', coalesce(pl.metadata->>'taskId', pl.metadata->>'rewardId', pl.metadata->>'itemId'),
    'title', coalesce(td.title, rd.name, pid.name),
    'detail', case
      when pl.reason = 'daily_bonus' then '当天必做任务全部完成'
      when pl.reason = 'adjustment' then '家长手动调整'
      when pl.reason = 'pet_purchase' then '宠物用品购买'
      when pl.reason = 'reward' then '家长批准兑换'
      when pl.reason = 'legacy_daily_earned' then '历史学习积分汇总'
      when pl.reason = 'legacy_balance_adjustment' then '历史余额校准'
      when coalesce((pl.metadata->>'contentRound')::integer, 0) > 0 then '第' || (((pl.metadata->>'contentRound')::integer) + 1)::text || '轮练习'
      else null
    end,
    'createdAt', pl.created_at
  ) order by pl.created_at desc), '[]'::jsonb)
  into v_records
  from public.point_ledger pl
  left join public.task_definitions td on td.id = pl.metadata->>'taskId'
  left join public.reward_definitions rd on rd.id = pl.metadata->>'rewardId'
  left join public.pet_item_definitions pid on pid.id = pl.metadata->>'itemId'
  where pl.child_id = v_child;

  return jsonb_set(v_response, '{state,pointRecords}', v_records, true);
end;
$$;

revoke all on function public.get_workspace() from public;
grant execute on function public.get_workspace() to authenticated;
