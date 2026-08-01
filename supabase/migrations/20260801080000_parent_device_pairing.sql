alter table public.device_pair_codes
  add column if not exists device_role text not null default 'child_device';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'device_pair_codes_device_role_check'
      and conrelid = 'public.device_pair_codes'::regclass
  ) then
    alter table public.device_pair_codes
      add constraint device_pair_codes_device_role_check
      check (device_role in ('parent', 'child_device'));
  end if;
end;
$$;

create or replace function public.create_parent_pair_code(p_command_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_family uuid := public.current_family_id();
  v_code text;
  v_hash text;
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
      insert into public.device_pair_codes (family_id, code_hash, expires_at, created_by, device_role)
      values (v_family, v_hash, now() + interval '10 minutes', auth.uid(), 'parent');
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

create or replace function public.claim_parent_pair_code(p_command_id uuid, p_code text, p_device_name text default 'Parent device')
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_pair public.device_pair_codes;
  v_child uuid;
  v_cached jsonb;
  v_response jsonb;
begin
  if auth.uid() is null or not coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'anonymous device session required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  if p_code !~ '^\d{6}$' then raise exception 'invalid parent pairing code'; end if;
  if (select count(*) from public.device_pair_attempts where user_id = auth.uid() and attempted_at > now() - interval '10 minutes') >= 5 then
    raise exception 'too many pairing attempts';
  end if;
  insert into public.device_pair_attempts (user_id) values (auth.uid());
  select * into v_pair from public.device_pair_codes
  where code_hash = encode(digest(p_code, 'sha256'), 'hex')
    and device_role = 'parent'
    and used_at is null
    and expires_at > now()
  order by created_at desc limit 1 for update;
  if v_pair.id is null then raise exception 'parent pairing code invalid or expired'; end if;
  update public.device_pair_codes set used_at = now(), claimed_by = auth.uid() where id = v_pair.id;
  insert into public.family_members (family_id, user_id, role, device_name)
  values (v_pair.family_id, auth.uid(), 'parent', coalesce(nullif(trim(p_device_name), ''), 'Parent device'))
  on conflict (family_id, user_id) do update
  set role = 'parent', device_name = excluded.device_name, revoked_at = null, created_at = now();
  select id into v_child from public.children where family_id = v_pair.family_id;
  v_response := jsonb_build_object('familyId', v_pair.family_id, 'childId', v_child, 'role', 'parent');
  insert into public.processed_commands (user_id, command_id, response) values (auth.uid(), p_command_id, v_response);
  return v_response;
end;
$$;

grant execute on function public.create_parent_pair_code(uuid), public.claim_parent_pair_code(uuid, text, text) to authenticated;
