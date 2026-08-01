alter table public.reward_requests
  add column if not exists cancelled_at timestamptz,
  add column if not exists rejected_at timestamptz;

alter table public.reward_requests drop constraint if exists reward_requests_status_check;
alter table public.reward_requests
  add constraint reward_requests_status_check
  check (status in ('pending', 'approved', 'fulfilled', 'cancelled', 'rejected'));

drop index if exists public.reward_requests_active_idx;
create unique index reward_requests_active_idx
  on public.reward_requests(child_id, reward_id)
  where status in ('pending', 'approved');

create or replace function public.set_reward_terminal_timestamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'cancelled' and new.cancelled_at is null then
    new.cancelled_at := now();
  elsif new.status = 'rejected' and new.rejected_at is null then
    new.rejected_at := now();
  end if;
  return new;
end;
$$;

create trigger reward_requests_terminal_timestamp
before insert or update of status on public.reward_requests
for each row execute function public.set_reward_terminal_timestamp();

alter function public.get_workspace() rename to get_workspace_v1;
revoke all on function public.get_workspace_v1() from public, authenticated;

create function public.get_workspace()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_response jsonb := public.get_workspace_v1();
  v_child uuid := public.current_child_id();
  v_requests jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id::text,
    'rewardId', reward_id,
    'rewardName', reward_name,
    'cost', cost,
    'status', status,
    'requestedAt', requested_at,
    'approvedAt', approved_at,
    'fulfilledAt', fulfilled_at,
    'cancelledAt', cancelled_at,
    'rejectedAt', rejected_at
  ) order by requested_at desc), '[]'::jsonb)
  into v_requests
  from public.reward_requests
  where child_id = v_child;

  return jsonb_set(v_response, '{state,rewardRequests}', v_requests, true);
end;
$$;

create or replace function public.cancel_reward(p_command_id uuid, p_request_id uuid)
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
  if public.current_member_role() <> 'child_device' then raise exception 'child device role required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;

  select * into v_request
  from public.reward_requests
  where id = p_request_id
    and child_id = v_child
    and requested_by = auth.uid()
    and status = 'pending'
  for update;
  if v_request.id is null then raise exception 'pending reward request not found'; end if;

  update public.reward_requests
  set status = 'cancelled', cancelled_at = now()
  where id = v_request.id;
  v_response := public.get_workspace();
  return public.save_command_response(p_command_id, v_response);
end;
$$;

create or replace function public.reject_reward(p_command_id uuid, p_request_id uuid)
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

  select * into v_request
  from public.reward_requests
  where id = p_request_id
    and child_id = v_child
    and status = 'pending'
  for update;
  if v_request.id is null then raise exception 'pending reward request not found'; end if;

  update public.reward_requests
  set status = 'rejected', rejected_at = now()
  where id = v_request.id;
  v_response := public.get_workspace();
  return public.save_command_response(p_command_id, v_response);
end;
$$;

revoke all on function public.get_workspace() from public;
revoke all on function public.cancel_reward(uuid, uuid) from public;
revoke all on function public.reject_reward(uuid, uuid) from public;
revoke all on function public.set_reward_terminal_timestamp() from public;

grant execute on function public.get_workspace(), public.cancel_reward(uuid, uuid), public.reject_reward(uuid, uuid) to authenticated;
