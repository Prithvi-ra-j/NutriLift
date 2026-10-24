create table public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  requests integer not null default 0 check (requests >= 0),
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;
revoke all on table public.ai_usage from public, anon, authenticated, service_role;

create table public.ai_usage_minute (
  user_id uuid not null references auth.users(id) on delete cascade,
  minute timestamptz not null,
  requests integer not null default 0 check (requests >= 0),
  primary key (user_id, minute)
);

alter table public.ai_usage_minute enable row level security;
revoke all on table public.ai_usage_minute from public, anon, authenticated, service_role;

create table public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('chat', 'transcription')),
  model text not null check (length(model) between 1 and 100),
  prompt_tokens integer check (prompt_tokens is null or prompt_tokens >= 0),
  completion_tokens integer check (completion_tokens is null or completion_tokens >= 0),
  created_at timestamptz not null default now()
);

create index ai_usage_log_user_created_idx
  on public.ai_usage_log (user_id, created_at desc);

alter table public.ai_usage_log enable row level security;
revoke all on table public.ai_usage_log from public, anon, authenticated, service_role;
grant insert on table public.ai_usage_log to service_role;

create or replace function public.consume_ai_quota(p_limit integer)
returns table (allowed boolean, remaining integer, quota_day date)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_day date := (now() at time zone 'utc')::date;
  v_requests integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_limit is null or p_limit < 1 then
    raise exception 'quota limit must be positive' using errcode = '22023';
  end if;

  insert into public.ai_usage (user_id, day, requests)
  values (v_user_id, v_day, 1)
  on conflict (user_id, day) do update
    set requests = public.ai_usage.requests + 1
  returning requests into v_requests;

  if v_requests > p_limit then
    update public.ai_usage
    set requests = requests - 1
    where user_id = v_user_id and day = v_day;
    return query select false, 0, v_day;
    return;
  end if;

  return query select true, p_limit - v_requests, v_day;
end;
$$;

create or replace function public.refund_ai_quota(p_user_id uuid, p_day date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'user id is required' using errcode = '22023';
  end if;
  if p_day is null
      or p_day < (now() at time zone 'utc')::date - 1
      or p_day > (now() at time zone 'utc')::date then
    raise exception 'invalid quota day' using errcode = '22023';
  end if;

  update public.ai_usage
  set requests = greatest(requests - 1, 0)
  where user_id = p_user_id and day = p_day;
end;
$$;

create or replace function public.consume_ai_minute_quota(p_limit integer)
returns table (allowed boolean, remaining integer, quota_minute timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_minute timestamptz := date_trunc('minute', now());
  v_requests integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_limit is null or p_limit < 1 then
    raise exception 'quota limit must be positive' using errcode = '22023';
  end if;

  insert into public.ai_usage_minute (user_id, minute, requests)
  values (v_user_id, v_minute, 1)
  on conflict (user_id, minute) do update
    set requests = public.ai_usage_minute.requests + 1
  returning requests into v_requests;

  if v_requests > p_limit then
    update public.ai_usage_minute
    set requests = requests - 1
    where user_id = v_user_id and minute = v_minute;
    return query select false, 0, v_minute;
    return;
  end if;

  return query select true, p_limit - v_requests, v_minute;
end;
$$;

create or replace function public.refund_ai_minute_quota(
  p_user_id uuid,
  p_minute timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'user id is required' using errcode = '22023';
  end if;
  if p_minute is null
      or p_minute < date_trunc('minute', now()) - interval '1 minute'
      or p_minute > date_trunc('minute', now()) then
    raise exception 'invalid quota minute' using errcode = '22023';
  end if;

  update public.ai_usage_minute
  set requests = greatest(requests - 1, 0)
  where user_id = p_user_id
    and minute = p_minute;
end;
$$;

revoke all on function public.consume_ai_quota(integer) from public, anon;
revoke all on function public.refund_ai_quota(uuid, date) from public, anon, authenticated;
revoke all on function public.consume_ai_minute_quota(integer) from public, anon;
revoke all on function public.refund_ai_minute_quota(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(integer) to authenticated;
grant execute on function public.refund_ai_quota(uuid, date) to service_role;
grant execute on function public.consume_ai_minute_quota(integer) to authenticated;
grant execute on function public.refund_ai_minute_quota(uuid, timestamptz) to service_role;