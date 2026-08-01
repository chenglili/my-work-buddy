alter table public.point_ledger drop constraint if exists point_ledger_reason_check;
alter table public.point_ledger
  add constraint point_ledger_reason_check
  check (reason in ('task', 'daily_bonus', 'reward', 'pet_purchase', 'adjustment', 'legacy_daily_earned', 'legacy_balance_adjustment'));

create table public.pet_item_definitions (
  id text primary key,
  name text not null,
  cost integer not null check (cost > 0),
  kind text not null check (kind in ('food', 'toy', 'care')),
  consumable boolean not null,
  satiety_gain integer not null default 0 check (satiety_gain >= 0),
  happiness_gain integer not null default 0 check (happiness_gain >= 0),
  cleanliness_gain integer not null default 0 check (cleanliness_gain >= 0)
);

insert into public.pet_item_definitions (id, name, cost, kind, consumable, satiety_gain, happiness_gain, cleanliness_gain) values
  ('parrot-food', '鹦鹉粮', 8, 'food', true, 28, 0, 0),
  ('apple-bites', '苹果粒', 12, 'food', true, 18, 12, 0),
  ('bell-toy', '叮当铃玩具', 35, 'toy', false, 0, 30, 0),
  ('bath-spray', '羽毛沐浴喷雾', 10, 'care', true, 0, 0, 35);

create table public.pet_profiles (
  child_id uuid primary key references public.children(id) on delete cascade,
  name text not null default '嘟嘟',
  satiety integer not null default 72 check (satiety between 0 and 100),
  happiness integer not null default 78 check (happiness between 0 and 100),
  cleanliness integer not null default 82 check (cleanliness between 0 and 100),
  inventory jsonb not null default '{}'::jsonb check (jsonb_typeof(inventory) = 'object'),
  owned_toys text[] not null default '{}'::text[],
  last_action text not null default 'idle' check (last_action in ('idle', 'purchase', 'feed', 'play', 'bathe')),
  last_message text not null default '啾！今天的值班铲屎官到岗了吗？',
  last_refreshed_date date not null default public.shanghai_today(),
  updated_at timestamptz not null default now()
);

create or replace function public.ensure_pet_profile(p_child_id uuid)
returns public.pet_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.pet_profiles;
begin
  insert into public.pet_profiles (child_id) values (p_child_id)
  on conflict (child_id) do nothing;
  select * into v_profile from public.pet_profiles where child_id = p_child_id;
  return v_profile;
end;
$$;

create or replace function public.refresh_pet_profile(p_child_id uuid)
returns public.pet_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.pet_profiles;
  v_today date := public.shanghai_today();
  v_satiety integer;
  v_happiness integer;
  v_cleanliness integer;
  v_message text;
begin
  perform public.ensure_pet_profile(p_child_id);
  select * into v_profile from public.pet_profiles where child_id = p_child_id for update;
  if v_profile.last_refreshed_date = v_today then return v_profile; end if;

  v_satiety := greatest(0, v_profile.satiety - 10);
  v_happiness := greatest(0, v_profile.happiness - 7);
  v_cleanliness := greatest(0, v_profile.cleanliness - 6);
  if v_satiety <= least(v_happiness, v_cleanliness) then
    v_message := '我肚子里的小鼓已经停止演奏了，懂我意思吧？';
  elsif v_cleanliness <= v_happiness then
    v_message := '羽毛有点不听话，本鸟申请一个豪华水疗。';
  else
    v_message := '叮当铃不响的时候，我连搞怪都没力气。';
  end if;

  update public.pet_profiles
  set satiety = v_satiety,
      happiness = v_happiness,
      cleanliness = v_cleanliness,
      last_action = 'idle',
      last_message = v_message,
      last_refreshed_date = v_today,
      updated_at = now()
  where child_id = p_child_id
  returning * into v_profile;
  return v_profile;
end;
$$;

alter function public.get_workspace() rename to get_workspace_v2;
revoke all on function public.get_workspace_v2() from public, authenticated;

create function public.get_workspace()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_response jsonb := public.get_workspace_v2();
  v_child uuid := public.current_child_id();
  v_profile public.pet_profiles;
  v_pet jsonb;
begin
  if v_child is null then raise exception 'family membership required'; end if;
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
  return jsonb_set(v_response, '{state,pet}', v_pet, true);
end;
$$;

create or replace function public.purchase_pet_item(p_command_id uuid, p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cached jsonb;
  v_child uuid := public.current_child_id();
  v_item public.pet_item_definitions;
  v_profile public.pet_profiles;
  v_response jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  if v_child is null then raise exception 'family membership required'; end if;
  select * into v_item from public.pet_item_definitions where id = p_item_id;
  if v_item.id is null then raise exception 'unknown pet item'; end if;

  perform pg_advisory_xact_lock(hashtextextended('points:' || v_child::text, 0));
  v_profile := public.refresh_pet_profile(v_child);
  if v_item.kind = 'toy' and p_item_id = any(v_profile.owned_toys) then raise exception 'pet item already owned'; end if;
  if public.point_balance(v_child) < v_item.cost then raise exception 'insufficient points'; end if;

  insert into public.point_ledger (child_id, date_key, delta, reason, source_key, metadata)
  values (v_child, public.shanghai_today(), -v_item.cost, 'pet_purchase', 'pet-purchase:' || p_command_id::text, jsonb_build_object('itemId', p_item_id));

  update public.pet_profiles
  set inventory = case when v_item.consumable then jsonb_set(
        inventory,
        array[p_item_id],
        to_jsonb(coalesce((inventory->>p_item_id)::integer, 0) + 1),
        true
      ) else inventory end,
      owned_toys = case when v_item.kind = 'toy' then array_append(owned_toys, p_item_id) else owned_toys end,
      last_action = 'purchase',
      last_message = case when v_item.kind = 'toy'
        then '叮当铃已签收！本鸟宣布客厅从此归我巡演。'
        else v_item.name || '已入库，看来你很懂本鸟的排面。' end,
      updated_at = now()
  where child_id = v_child;

  v_response := public.get_workspace();
  return public.save_command_response(p_command_id, v_response);
end;
$$;

create or replace function public.interact_pet(p_command_id uuid, p_action text, p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cached jsonb;
  v_child uuid := public.current_child_id();
  v_item public.pet_item_definitions;
  v_profile public.pet_profiles;
  v_count integer;
  v_response jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_command_id::text, 0));
  select response into v_cached from public.processed_commands where user_id = auth.uid() and command_id = p_command_id;
  if v_cached is not null then return v_cached; end if;
  if v_child is null then raise exception 'family membership required'; end if;
  if p_action not in ('feed', 'play', 'bathe') then raise exception 'invalid pet action'; end if;
  select * into v_item from public.pet_item_definitions where id = p_item_id;
  if v_item.id is null then raise exception 'unknown pet item'; end if;

  v_profile := public.refresh_pet_profile(v_child);
  if (p_action = 'feed' and v_item.kind <> 'food')
    or (p_action = 'play' and v_item.kind <> 'toy')
    or (p_action = 'bathe' and v_item.kind <> 'care') then
    raise exception 'pet item does not match action';
  end if;
  if p_action = 'play' and not (p_item_id = any(v_profile.owned_toys)) then raise exception 'pet toy not owned'; end if;
  v_count := coalesce((v_profile.inventory->>p_item_id)::integer, 0);
  if v_item.consumable and v_count < 1 then raise exception 'pet item unavailable'; end if;

  update public.pet_profiles
  set satiety = least(100, satiety + v_item.satiety_gain),
      happiness = least(100, happiness + v_item.happiness_gain),
      cleanliness = least(100, cleanliness + v_item.cleanliness_gain),
      inventory = case when v_item.consumable then jsonb_set(inventory, array[p_item_id], to_jsonb(v_count - 1), true) else inventory end,
      last_action = p_action,
      last_message = case
        when p_item_id = 'apple-bites' then '苹果粒到嘴，本鸟宣布今天是好日子！'
        when p_action = 'feed' then '咔嚓咔嚓！这口粮，勉强给你五星好评。'
        when p_action = 'play' then '叮铃铃！看我表演一个原地起飞……算了，先鼓掌。'
        else '洗完啦！现在每根羽毛都在偷偷发光。' end,
      updated_at = now()
  where child_id = v_child;

  v_response := public.get_workspace();
  return public.save_command_response(p_command_id, v_response);
end;
$$;

alter table public.pet_item_definitions enable row level security;
alter table public.pet_profiles enable row level security;

create policy pet_item_definitions_read on public.pet_item_definitions for select to authenticated using (true);
create policy pet_profiles_read on public.pet_profiles for select to authenticated using (child_id = public.current_child_id());

revoke all on public.pet_item_definitions, public.pet_profiles from anon, authenticated;
grant select on public.pet_item_definitions, public.pet_profiles to authenticated;

revoke all on function public.get_workspace() from public;
revoke all on function public.purchase_pet_item(uuid, text) from public;
revoke all on function public.interact_pet(uuid, text, text) from public;
revoke all on function public.ensure_pet_profile(uuid) from public;
revoke all on function public.refresh_pet_profile(uuid) from public;

grant execute on function public.get_workspace(), public.purchase_pet_item(uuid, text), public.interact_pet(uuid, text, text) to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pet_profiles') then
    alter publication supabase_realtime add table public.pet_profiles;
  end if;
end $$;
