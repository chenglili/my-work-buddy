create extension if not exists pgcrypto;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default '甜心家庭',
  timezone text not null default 'Asia/Shanghai',
  legacy_imported_at timestamptz,
  legacy_import_hash text,
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('parent', 'child_device')),
  device_name text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create unique index family_members_active_user_idx on public.family_members(user_id) where revoked_at is null;

create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  nickname text not null default '宝贝',
  region text not null default '江苏',
  grade text not null default '一升二',
  curriculum text not null default '统编语文、苏教数学、译林英语二上',
  created_at timestamptz not null default now(),
  unique (family_id)
);

create table public.device_pair_codes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid not null references auth.users(id),
  claimed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create unique index device_pair_codes_active_code_idx on public.device_pair_codes(code_hash) where used_at is null;

create table public.device_pair_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index device_pair_attempts_user_time_idx on public.device_pair_attempts(user_id, attempted_at desc);

create table public.task_definitions (
  id text primary key,
  title text not null,
  points integer not null check (points > 0),
  schedule text not null check (schedule in ('core', 'rotation', 'optional')),
  completion_mode text not null check (completion_mode in ('auto', 'timer', 'parent')),
  minimum_score integer,
  minimum_duration integer,
  requires_parent boolean not null default false
);

insert into public.task_definitions (id, title, points, schedule, completion_mode, minimum_score, minimum_duration, requires_parent) values
  ('chinese-morning-reading', '每日晨读', 5, 'core', 'timer', null, 600, false),
  ('chinese-preview-copybook', '预习二上语文课本和同步字帖', 5, 'rotation', 'parent', null, null, true),
  ('chinese-memorize', '二年级上册必背课本内容', 5, 'rotation', 'parent', null, null, true),
  ('chinese-dictation', '听写二年级上册生字', 5, 'rotation', 'parent', null, null, true),
  ('chinese-night-reading', '晚上晚读半小时', 5, 'core', 'timer', null, 900, false),
  ('chinese-picture-writing', '看图写话练习', 5, 'rotation', 'parent', null, null, true),
  ('chinese-reading-comprehension', '阅读理解专项', 5, 'rotation', 'auto', 80, null, false),
  ('math-arithmetic', '口算小练习', 5, 'core', 'auto', 80, null, false),
  ('math-multiply-divide', '乘除法练习', 5, 'rotation', 'auto', 80, null, false),
  ('math-word-problems', '应用题练习', 5, 'rotation', 'auto', 80, null, false),
  ('english-daily', '英语每日听读任务', 6, 'core', 'timer', null, 900, false),
  ('game-hanzi', '汉字闯关', 3, 'optional', 'auto', 80, null, false),
  ('game-number', '数字解谜', 3, 'optional', 'auto', 80, null, false),
  ('game-spot', '找不同', 3, 'optional', 'auto', 80, null, false),
  ('game-logic', '逻辑推理小游戏', 3, 'optional', 'auto', 80, null, false),
  ('sport-rope', '跳绳打卡任务', 6, 'core', 'parent', null, null, true),
  ('sport-high-jump', '摸高跳打卡任务', 6, 'core', 'parent', null, null, true),
  ('sport-hour', '每日运动总目标', 6, 'core', 'parent', null, null, true);

create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  date_key date not null,
  required_task_ids text[] not null,
  bonus_awarded boolean not null default false,
  created_at timestamptz not null default now(),
  unique (child_id, date_key)
);

create table public.task_records (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  date_key date not null,
  task_id text not null references public.task_definitions(id),
  status text not null check (status in ('pending_review', 'completed', 'rejected')),
  result jsonb not null default '{}'::jsonb,
  submitted_by uuid not null references auth.users(id),
  submitted_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (child_id, date_key, task_id)
);

create table public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  date_key date not null,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('task', 'daily_bonus', 'reward', 'adjustment', 'legacy_daily_earned', 'legacy_balance_adjustment')),
  source_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (child_id, source_key)
);

create table public.reward_definitions (
  id text primary key,
  name text not null,
  cost integer not null check (cost > 0)
);

insert into public.reward_definitions (id, name, cost) values
  ('reward-snack', '零食', 80),
  ('reward-cartoon-30', '动画30分钟', 100),
  ('reward-toy', '玩具', 250);

create table public.reward_requests (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  reward_id text not null references public.reward_definitions(id),
  reward_name text not null,
  cost integer not null check (cost > 0),
  status text not null check (status in ('pending', 'approved', 'fulfilled')),
  requested_by uuid not null references auth.users(id),
  command_id uuid,
  legacy_id text,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  fulfilled_at timestamptz
);

create unique index reward_requests_command_idx on public.reward_requests(requested_by, command_id) where command_id is not null;
create unique index reward_requests_active_idx on public.reward_requests(child_id, reward_id) where status <> 'fulfilled';
create unique index reward_requests_legacy_idx on public.reward_requests(child_id, legacy_id) where legacy_id is not null;

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  date_key date not null,
  event_type text not null default 'daily-ready',
  status text not null check (status in ('sending', 'sent', 'failed')),
  attempts integer not null default 1,
  last_error text,
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (child_id, date_key, event_type)
);

create table public.processed_commands (
  user_id uuid not null references auth.users(id) on delete cascade,
  command_id uuid not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, command_id)
);

create or replace function public.shanghai_today()
returns date
language sql
stable
as $$ select (timezone('Asia/Shanghai', now()))::date $$;

create or replace function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.family_members
  where user_id = auth.uid() and revoked_at is null
  limit 1
$$;

create or replace function public.current_member_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.family_members
  where user_id = auth.uid() and revoked_at is null
  limit 1
$$;

create or replace function public.current_child_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id from public.children c
  where c.family_id = public.current_family_id()
  limit 1
$$;

create or replace function public.required_task_ids_for_date(p_date date)
returns text[]
language plpgsql
immutable
as $$
declare
  v_day_number integer := p_date - date '1970-01-01';
  v_sport text[] := array['sport-rope', 'sport-high-jump', 'sport-hour'];
  v_common text[];
  v_rotation text[] := array['chinese-preview-copybook', 'math-multiply-divide', 'chinese-dictation', 'chinese-reading-comprehension', 'chinese-picture-writing', 'math-word-problems', 'chinese-memorize'];
  v_unit_start integer;
  v_unit_tasks text[];
  v_day integer := extract(day from p_date)::integer;
begin
  v_common := array['chinese-morning-reading', 'math-arithmetic', 'english-daily', 'chinese-night-reading', v_sport[(v_day_number % 3) + 1]];
  if extract(dow from p_date) = 0 then
    return array['chinese-morning-reading', 'english-daily', 'chinese-night-reading', v_sport[(v_day_number % 3) + 1]];
  end if;

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
begin
  insert into public.daily_plans (child_id, date_key, required_task_ids)
  values (p_child_id, p_date, public.required_task_ids_for_date(p_date))
  on conflict (child_id, date_key) do nothing;
  select * into v_plan from public.daily_plans where child_id = p_child_id and date_key = p_date;
  return v_plan;
end;
$$;

create or replace function public.point_balance(p_child_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$ select coalesce(sum(delta), 0)::integer from public.point_ledger where child_id = p_child_id $$;

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
      where tr.child_id = p_child_id and tr.date_key = p_date and tr.task_id = required.required_id and tr.status = 'completed'
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

create or replace function public.ensure_parent_family(p_name text default '甜心家庭')
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family uuid;
  v_child uuid;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'parent authentication required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('parent-family:' || auth.uid()::text, 0));
  select family_id into v_family from public.family_members where user_id = auth.uid() and revoked_at is null limit 1;
  if v_family is null then
    insert into public.families (name) values (coalesce(nullif(trim(p_name), ''), '甜心家庭')) returning id into v_family;
    insert into public.family_members (family_id, user_id, role, device_name) values (v_family, auth.uid(), 'parent', '家长设备');
    insert into public.children (family_id) values (v_family) returning id into v_child;
  else
    select id into v_child from public.children where family_id = v_family;
  end if;
  return jsonb_build_object('familyId', v_family, 'childId', v_child, 'role', 'parent');
end;
$$;

create or replace function public.create_pair_code(p_command_id uuid, p_device_name text default '孩子设备')
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family uuid := public.current_family_id();
  v_code text;
  v_hash text;
  v_id uuid;
  v_cached jsonb;
  v_response jsonb;
begin
  if public.current_member_role() <> 'parent' then raise exception 'parent role required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  update public.device_pair_codes set used_at = now() where family_id = v_family and used_at is null;
  loop
    v_code := lpad(floor(random() * 1000000)::integer::text, 6, '0');
    v_hash := encode(digest(v_code, 'sha256'), 'hex');
    begin
      insert into public.device_pair_codes (family_id, code_hash, expires_at, created_by)
      values (v_family, v_hash, now() + interval '10 minutes', auth.uid()) returning id into v_id;
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;
  v_response := jsonb_build_object('code', v_code, 'expiresAt', (now() + interval '10 minutes'));
  insert into public.processed_commands (user_id, command_id, response) values (auth.uid(), p_command_id, v_response);
  return v_response;
end;
$$;

create or replace function public.claim_pair_code(p_command_id uuid, p_code text, p_device_name text default '孩子设备')
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_pair public.device_pair_codes;
  v_child uuid;
  v_cached jsonb;
  v_response jsonb;
begin
  if auth.uid() is null or not coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'anonymous child session required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  if p_code !~ '^\d{6}$' then raise exception 'invalid pairing code'; end if;
  if (select count(*) from public.device_pair_attempts where user_id = auth.uid() and attempted_at > now() - interval '10 minutes') >= 5 then
    raise exception 'too many pairing attempts';
  end if;
  insert into public.device_pair_attempts (user_id) values (auth.uid());

  select * into v_pair from public.device_pair_codes
  where code_hash = encode(digest(p_code, 'sha256'), 'hex') and used_at is null and expires_at > now()
  order by created_at desc limit 1 for update;
  if v_pair.id is null then raise exception 'pairing code invalid or expired'; end if;

  update public.device_pair_codes set used_at = now(), claimed_by = auth.uid() where id = v_pair.id;
  insert into public.family_members (family_id, user_id, role, device_name)
  values (v_pair.family_id, auth.uid(), 'child_device', coalesce(nullif(trim(p_device_name), ''), '孩子设备'))
  on conflict (family_id, user_id) do update
  set role = 'child_device', device_name = excluded.device_name, revoked_at = null, created_at = now();
  select id into v_child from public.children where family_id = v_pair.family_id;
  v_response := jsonb_build_object('familyId', v_pair.family_id, 'childId', v_child, 'role', 'child_device');
  insert into public.processed_commands (user_id, command_id, response) values (auth.uid(), p_command_id, v_response);
  return v_response;
end;
$$;

create or replace function public.revoke_child_device(p_command_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cached jsonb;
  v_response jsonb;
begin
  if public.current_member_role() <> 'parent' then raise exception 'parent role required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  update public.family_members set revoked_at = now()
  where family_id = public.current_family_id() and user_id = p_user_id and role = 'child_device' and revoked_at is null;
  v_response := jsonb_build_object('revoked', true);
  insert into public.processed_commands (user_id, command_id, response) values (auth.uid(), p_command_id, v_response);
  return v_response;
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
  v_state jsonb;
begin
  if v_family is null or v_child is null then raise exception 'family membership required'; end if;
  perform public.ensure_daily_plan(v_child, v_today);

  v_state := jsonb_build_object(
    'dateKey', v_today::text,
    'points', public.point_balance(v_child),
    'completedTaskIds', coalesce((select jsonb_agg(task_id order by task_id) from public.task_records where child_id = v_child and date_key = v_today and status = 'completed'), '[]'::jsonb),
    'bonusAwarded', coalesce((select bonus_awarded from public.daily_plans where child_id = v_child and date_key = v_today), false),
    'completedDates', coalesce((select jsonb_agg(date_key::text order by date_key) from public.daily_plans where child_id = v_child and bonus_awarded), '[]'::jsonb),
    'taskResults', coalesce((select jsonb_agg(jsonb_build_object('durationSeconds', coalesce((result->>'durationSeconds')::integer, 0), 'attempts', coalesce((result->>'attempts')::integer, 1), 'wrongQuestions', coalesce(result->'wrongQuestions', '[]'::jsonb)) || result || jsonb_build_object('taskId', task_id, 'dateKey', date_key::text, 'completedAt', completed_at) order by completed_at) from public.task_records where child_id = v_child and status = 'completed'), '[]'::jsonb),
    'pendingTaskReviews', coalesce((select jsonb_agg(jsonb_build_object('id', tr.id::text, 'taskId', tr.task_id, 'taskTitle', td.title, 'points', td.points, 'dateKey', tr.date_key::text, 'result', tr.result, 'submittedAt', tr.submitted_at) order by tr.submitted_at) from public.task_records tr join public.task_definitions td on td.id = tr.task_id where tr.child_id = v_child and tr.date_key = v_today and tr.status = 'pending_review'), '[]'::jsonb),
    'weeklyPoints', coalesce((select jsonb_object_agg(week_key, points) from (select (date_key - (extract(isodow from date_key)::integer - 1))::text week_key, sum(delta)::integer points from public.point_ledger where child_id = v_child and reason in ('task', 'daily_bonus', 'legacy_daily_earned') group by 1) weeks), '{}'::jsonb),
    'dailyEarnedPoints', coalesce((select jsonb_object_agg(date_key::text, points) from (select date_key, sum(delta)::integer points from public.point_ledger where child_id = v_child and reason in ('task', 'daily_bonus', 'legacy_daily_earned') group by date_key) days), '{}'::jsonb),
    'rewardRequests', coalesce((select jsonb_agg(jsonb_build_object('id', coalesce(legacy_id, id::text), 'rewardId', reward_id, 'rewardName', reward_name, 'cost', cost, 'status', status, 'requestedAt', requested_at, 'approvedAt', approved_at, 'fulfilledAt', fulfilled_at) order by requested_at desc) from public.reward_requests where child_id = v_child), '[]'::jsonb),
    'notifiedDailyReadyDates', coalesce((select jsonb_agg(date_key::text order by date_key) from public.notification_events where child_id = v_child and event_type = 'daily-ready' and status = 'sent'), '[]'::jsonb)
  );

  return jsonb_build_object(
    'state', v_state,
    'role', public.current_member_role(),
    'familyId', v_family,
    'childId', v_child,
    'legacyImported', (select legacy_imported_at is not null from public.families where id = v_family),
    'devices', case when public.current_member_role() = 'parent' then coalesce((select jsonb_agg(jsonb_build_object('userId', user_id, 'name', coalesce(device_name, '孩子设备'), 'createdAt', created_at) order by created_at) from public.family_members where family_id = v_family and role = 'child_device' and revoked_at is null), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

create or replace function public.save_command_response(p_command_id uuid, p_response jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.processed_commands (user_id, command_id, response)
  values (auth.uid(), p_command_id, p_response)
  on conflict (user_id, command_id) do update set response = excluded.response;
  return p_response;
end;
$$;

create or replace function public.submit_task(p_command_id uuid, p_date_key date, p_task_id text, p_result jsonb default '{}'::jsonb)
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
  v_task public.task_definitions;
  v_status text;
  v_response jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  if v_child is null then raise exception 'family membership required'; end if;
  if p_date_key <> v_today then raise exception 'offline task expired at midnight'; end if;

  v_plan := public.ensure_daily_plan(v_child, p_date_key);
  select * into v_task from public.task_definitions where id = p_task_id;
  if v_task.id is null then raise exception 'unknown task'; end if;
  if not (p_task_id = any(v_plan.required_task_ids) or v_task.schedule = 'optional') then raise exception 'task is not scheduled today'; end if;
  if v_task.schedule = 'optional' and exists (
    select 1 from unnest(v_plan.required_task_ids) required_id
    where not exists (select 1 from public.task_records where child_id = v_child and date_key = p_date_key and task_id = required_id and status in ('completed', 'pending_review'))
  ) then raise exception 'optional tasks are locked'; end if;

  if v_task.completion_mode = 'auto' and coalesce((p_result->>'score')::integer, 0) < coalesce(v_task.minimum_score, 80) then raise exception 'minimum score not reached'; end if;
  if v_task.completion_mode = 'timer' and coalesce((p_result->>'durationSeconds')::integer, 0) < coalesce(v_task.minimum_duration, 0) then raise exception 'minimum duration not reached'; end if;
  v_status := case when v_task.completion_mode = 'parent' then 'pending_review' else 'completed' end;

  insert into public.task_records (child_id, date_key, task_id, status, result, submitted_by, completed_at)
  values (v_child, p_date_key, p_task_id, v_status, coalesce(p_result, '{}'::jsonb), auth.uid(), case when v_status = 'completed' then now() end)
  on conflict (child_id, date_key, task_id) do update
  set status = excluded.status, result = excluded.result, submitted_by = excluded.submitted_by,
      submitted_at = now(), completed_at = excluded.completed_at, updated_at = now()
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
    insert into public.point_ledger (child_id, date_key, delta, reason, source_key, metadata)
    values (v_child, v_record.date_key, v_points, 'task', 'task:' || v_record.date_key::text || ':' || v_record.task_id, jsonb_build_object('taskId', v_record.task_id))
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
  v_record record;
  v_response jsonb;
begin
  if public.current_member_role() <> 'parent' then raise exception 'parent role required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  for v_record in
    select tr.id, tr.task_id, td.points from public.task_records tr join public.task_definitions td on td.id = tr.task_id
    where tr.child_id = v_child and tr.date_key = v_today and tr.status = 'pending_review' for update of tr
  loop
    update public.task_records set status = 'completed', completed_at = now(), updated_at = now() where id = v_record.id;
    insert into public.point_ledger (child_id, date_key, delta, reason, source_key, metadata)
    values (v_child, v_today, v_record.points, 'task', 'task:' || v_today::text || ':' || v_record.task_id, jsonb_build_object('taskId', v_record.task_id))
    on conflict (child_id, source_key) do nothing;
  end loop;
  perform public.maybe_award_daily_bonus(v_child, v_today);
  v_response := public.get_workspace();
  return public.save_command_response(p_command_id, v_response);
end;
$$;

create or replace function public.request_reward(p_command_id uuid, p_reward_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cached jsonb;
  v_child uuid := public.current_child_id();
  v_reward public.reward_definitions;
  v_response jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  if extract(dow from public.shanghai_today()) not in (0, 6) then raise exception 'rewards are available on weekends'; end if;
  select * into v_reward from public.reward_definitions where id = p_reward_id;
  if v_reward.id is null or public.point_balance(v_child) < v_reward.cost then raise exception 'insufficient points'; end if;
  insert into public.reward_requests (child_id, reward_id, reward_name, cost, status, requested_by, command_id)
  values (v_child, v_reward.id, v_reward.name, v_reward.cost, 'pending', auth.uid(), p_command_id);
  v_response := public.get_workspace();
  return public.save_command_response(p_command_id, v_response);
end;
$$;

create or replace function public.approve_reward(p_command_id uuid, p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cached jsonb;
  v_child uuid := public.current_child_id();
  v_request public.reward_requests;
  v_response jsonb;
begin
  if public.current_member_role() <> 'parent' then raise exception 'parent role required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  perform pg_advisory_xact_lock(hashtextextended('points:' || v_child::text, 0));
  select * into v_request from public.reward_requests where id = p_request_id and child_id = v_child and status = 'pending' for update;
  if v_request.id is null or public.point_balance(v_child) < v_request.cost then raise exception 'request unavailable or insufficient points'; end if;
  update public.reward_requests set status = 'approved', approved_at = now() where id = v_request.id;
  insert into public.point_ledger (child_id, date_key, delta, reason, source_key, metadata)
  values (v_child, public.shanghai_today(), -v_request.cost, 'reward', 'reward:' || v_request.id::text, jsonb_build_object('rewardId', v_request.reward_id))
  on conflict (child_id, source_key) do nothing;
  v_response := public.get_workspace();
  return public.save_command_response(p_command_id, v_response);
end;
$$;

create or replace function public.fulfill_reward(p_command_id uuid, p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cached jsonb;
  v_child uuid := public.current_child_id();
  v_response jsonb;
begin
  if public.current_member_role() <> 'parent' then raise exception 'parent role required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  update public.reward_requests set status = 'fulfilled', fulfilled_at = now()
  where id = p_request_id and child_id = v_child and status = 'approved';
  if not found then raise exception 'approved request not found'; end if;
  v_response := public.get_workspace();
  return public.save_command_response(p_command_id, v_response);
end;
$$;

create or replace function public.adjust_points(p_command_id uuid, p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cached jsonb;
  v_child uuid := public.current_child_id();
  v_response jsonb;
begin
  if public.current_member_role() <> 'parent' then raise exception 'parent role required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  perform pg_advisory_xact_lock(hashtextextended('points:' || v_child::text, 0));
  if p_amount = 0 or public.point_balance(v_child) + p_amount < 0 then raise exception 'invalid point adjustment'; end if;
  insert into public.point_ledger (child_id, date_key, delta, reason, source_key)
  values (v_child, public.shanghai_today(), p_amount, 'adjustment', 'adjustment:' || p_command_id::text);
  v_response := public.get_workspace();
  return public.save_command_response(p_command_id, v_response);
end;
$$;

create or replace function public.claim_daily_notification_for_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child uuid;
  v_today date := public.shanghai_today();
  v_plan public.daily_plans;
  v_event public.notification_events;
begin
  select c.id into v_child
  from public.family_members fm join public.children c on c.family_id = fm.family_id
  where fm.user_id = p_user_id and fm.revoked_at is null limit 1;
  if v_child is null then raise exception 'family membership required'; end if;
  v_plan := public.ensure_daily_plan(v_child, v_today);
  if exists (
    select 1 from unnest(v_plan.required_task_ids) as required(required_id)
    where not exists (select 1 from public.task_records tr where tr.child_id = v_child and tr.date_key = v_today and tr.task_id = required.required_id and tr.status in ('completed', 'pending_review'))
  ) then return jsonb_build_object('claimed', false); end if;

  insert into public.notification_events (child_id, date_key, status)
  values (v_child, v_today, 'sending')
  on conflict (child_id, date_key, event_type) do update
  set status = 'sending', attempts = public.notification_events.attempts + 1, updated_at = now(), last_error = null
  where public.notification_events.status <> 'sent'
    and (public.notification_events.status <> 'sending' or public.notification_events.updated_at <= now() - interval '2 minutes')
  returning * into v_event;
  if v_event.id is null then return jsonb_build_object('claimed', false); end if;
  return jsonb_build_object('claimed', true, 'childId', v_child, 'dateKey', v_today::text);
end;
$$;

create or replace function public.finish_daily_notification(p_child_id uuid, p_date_key date, p_success boolean, p_error text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_events
  set status = case when p_success then 'sent' else 'failed' end,
      sent_at = case when p_success then now() else sent_at end,
      last_error = case when p_success then null else left(coalesce(p_error, 'notification failed'), 200) end,
      updated_at = now()
  where child_id = p_child_id and date_key = p_date_key and event_type = 'daily-ready';
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
      insert into public.task_records (child_id, date_key, task_id, status, result, submitted_by, submitted_at, completed_at)
      values (v_child, v_date, v_task_id, 'completed', v_item - 'taskId' - 'dateKey' - 'completedAt', auth.uid(), coalesce((v_item->>'completedAt')::timestamptz, now()), coalesce((v_item->>'completedAt')::timestamptz, now()))
      on conflict (child_id, date_key, task_id) do nothing;
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_legacy->'pendingTaskReviews', '[]'::jsonb)) loop
    v_task_id := v_item->>'taskId';
    v_date := (v_item->>'dateKey')::date;
    if exists (select 1 from public.task_definitions where id = v_task_id) then
      perform public.ensure_daily_plan(v_child, v_date);
      insert into public.task_records (child_id, date_key, task_id, status, result, submitted_by, submitted_at)
      values (v_child, v_date, v_task_id, 'pending_review', coalesce(v_item->'result', '{}'::jsonb), auth.uid(), coalesce((v_item->>'submittedAt')::timestamptz, now()))
      on conflict (child_id, date_key, task_id) do nothing;
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_legacy->'completedTaskIds', '[]'::jsonb)) loop
    v_task_id := trim(both '"' from v_item::text);
    if exists (select 1 from public.task_definitions where id = v_task_id) then
      perform public.ensure_daily_plan(v_child, v_today);
      insert into public.task_records (child_id, date_key, task_id, status, result, submitted_by, completed_at)
      values (v_child, v_today, v_task_id, 'completed', '{}'::jsonb, auth.uid(), now())
      on conflict (child_id, date_key, task_id) do nothing;
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

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.children enable row level security;
alter table public.device_pair_codes enable row level security;
alter table public.device_pair_attempts enable row level security;
alter table public.task_definitions enable row level security;
alter table public.daily_plans enable row level security;
alter table public.task_records enable row level security;
alter table public.point_ledger enable row level security;
alter table public.reward_definitions enable row level security;
alter table public.reward_requests enable row level security;
alter table public.notification_events enable row level security;
alter table public.processed_commands enable row level security;

create policy families_read on public.families for select to authenticated using (id = public.current_family_id());
create policy members_read on public.family_members for select to authenticated using (family_id = public.current_family_id());
create policy children_read on public.children for select to authenticated using (family_id = public.current_family_id());
create policy pair_codes_parent_read on public.device_pair_codes for select to authenticated using (family_id = public.current_family_id() and public.current_member_role() = 'parent');
create policy task_definitions_read on public.task_definitions for select to authenticated using (true);
create policy daily_plans_read on public.daily_plans for select to authenticated using (child_id = public.current_child_id());
create policy task_records_read on public.task_records for select to authenticated using (child_id = public.current_child_id());
create policy point_ledger_read on public.point_ledger for select to authenticated using (child_id = public.current_child_id());
create policy reward_definitions_read on public.reward_definitions for select to authenticated using (true);
create policy reward_requests_read on public.reward_requests for select to authenticated using (child_id = public.current_child_id());
create policy notification_events_read on public.notification_events for select to authenticated using (child_id = public.current_child_id());
create policy processed_commands_read on public.processed_commands for select to authenticated using (user_id = auth.uid());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.families, public.family_members, public.children, public.device_pair_codes, public.task_definitions, public.daily_plans, public.task_records, public.point_ledger, public.reward_definitions, public.reward_requests, public.notification_events, public.processed_commands to authenticated;

revoke all on function public.ensure_parent_family(text) from public;
revoke all on function public.create_pair_code(uuid, text) from public;
revoke all on function public.claim_pair_code(uuid, text, text) from public;
revoke all on function public.revoke_child_device(uuid, uuid) from public;
revoke all on function public.get_workspace() from public;
revoke all on function public.submit_task(uuid, date, text, jsonb) from public;
revoke all on function public.review_task(uuid, uuid, text) from public;
revoke all on function public.review_all(uuid) from public;
revoke all on function public.request_reward(uuid, text) from public;
revoke all on function public.approve_reward(uuid, uuid) from public;
revoke all on function public.fulfill_reward(uuid, uuid) from public;
revoke all on function public.adjust_points(uuid, integer) from public;
revoke all on function public.claim_daily_notification_for_user(uuid) from public;
revoke all on function public.finish_daily_notification(uuid, date, boolean, text) from public;
revoke all on function public.import_legacy_workspace(uuid, jsonb, text) from public;
revoke all on function public.ensure_daily_plan(uuid, date) from public;
revoke all on function public.point_balance(uuid) from public;
revoke all on function public.maybe_award_daily_bonus(uuid, date) from public;
revoke all on function public.save_command_response(uuid, jsonb) from public;

grant execute on function public.ensure_parent_family(text), public.create_pair_code(uuid, text), public.claim_pair_code(uuid, text, text), public.revoke_child_device(uuid, uuid), public.get_workspace(), public.submit_task(uuid, date, text, jsonb), public.review_task(uuid, uuid, text), public.review_all(uuid), public.request_reward(uuid, text), public.approve_reward(uuid, uuid), public.fulfill_reward(uuid, uuid), public.adjust_points(uuid, integer), public.import_legacy_workspace(uuid, jsonb, text) to authenticated;
grant execute on function public.claim_daily_notification_for_user(uuid), public.finish_daily_notification(uuid, date, boolean, text) to service_role;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_records') then
    alter publication supabase_realtime add table public.task_records, public.point_ledger, public.reward_requests, public.family_members;
  end if;
end $$;
