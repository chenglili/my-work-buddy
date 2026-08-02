-- A completed Saturday unlocks the full Sunday plan for the next day.
-- Keep the existing light Sunday plan when the previous day was not completed.

create or replace function public.required_task_ids_for_date_with_history(
  p_date date,
  p_previous_day_completed boolean default false
)
returns text[]
language plpgsql
immutable
as $$
declare
  v_day_number integer := p_date - date '1970-01-01';
  v_sport text[] := array['sport-rope', 'sport-high-jump', 'sport-hour'];
  v_common text[];
  v_rotation text[] := array[
    'chinese-preview-copybook',
    'math-multiply-divide',
    'chinese-dictation',
    'chinese-reading-comprehension',
    'chinese-picture-writing',
    'math-word-problems',
    'chinese-memorize'
  ];
  v_unit_start integer;
  v_unit_tasks text[];
  v_day integer := extract(day from p_date)::integer;
begin
  if extract(dow from p_date) = 0 and not p_previous_day_completed then
    return public.required_task_ids_for_date(p_date);
  end if;

  v_common := array[
    'chinese-morning-reading',
    'math-arithmetic',
    'english-daily',
    'chinese-night-reading',
    v_sport[(v_day_number % 3) + 1]
  ];

  if extract(month from p_date) = 8 then
    if v_day between 1 and 4 then
      v_unit_start := 1;
      v_unit_tasks := array['chinese-preview-copybook', 'chinese-dictation', 'chinese-reading-comprehension', 'chinese-memorize'];
    elsif v_day between 5 and 8 then
      v_unit_start := 5;
      v_unit_tasks := array['chinese-preview-copybook', 'math-multiply-divide', 'chinese-reading-comprehension', 'chinese-picture-writing'];
    elsif v_day between 9 and 12 then
      v_unit_start := 9;
      v_unit_tasks := array['chinese-preview-copybook', 'chinese-dictation', 'math-word-problems', 'chinese-memorize'];
    elsif v_day between 13 and 16 then
      v_unit_start := 13;
      v_unit_tasks := array['chinese-preview-copybook', 'math-multiply-divide', 'chinese-reading-comprehension', 'chinese-picture-writing'];
    elsif v_day between 17 and 20 then
      v_unit_start := 17;
      v_unit_tasks := array['chinese-preview-copybook', 'chinese-dictation', 'math-word-problems', 'chinese-memorize'];
    elsif v_day between 21 and 24 then
      v_unit_start := 21;
      v_unit_tasks := array['chinese-preview-copybook', 'math-multiply-divide', 'chinese-reading-comprehension', 'chinese-picture-writing'];
    elsif v_day between 25 and 27 then
      v_unit_start := 25;
      v_unit_tasks := array['chinese-preview-copybook', 'chinese-dictation', 'math-word-problems'];
    else
      v_unit_start := 28;
      v_unit_tasks := array['chinese-preview-copybook', 'math-multiply-divide', 'chinese-reading-comprehension', 'chinese-memorize'];
    end if;
    return v_common || v_unit_tasks[((v_day - v_unit_start) % array_length(v_unit_tasks, 1)) + 1];
  end if;

  return v_common || v_rotation[(v_day_number % array_length(v_rotation, 1)) + 1];
end;
$$;

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

  insert into public.daily_plans (child_id, date_key, required_task_ids)
  values (p_child_id, p_date, v_required_task_ids)
  on conflict (child_id, date_key) do update
    set required_task_ids = case
      when extract(dow from p_date) = 0
       and v_previous_day_completed
       and daily_plans.required_task_ids <> excluded.required_task_ids
        then excluded.required_task_ids
      else daily_plans.required_task_ids
    end;

  select *
    into v_plan
    from public.daily_plans
   where child_id = p_child_id
     and date_key = p_date;
  return v_plan;
end;
$$;

revoke all on function public.required_task_ids_for_date_with_history(date, boolean) from public;
grant execute on function public.required_task_ids_for_date_with_history(date, boolean) to authenticated;
