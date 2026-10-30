-- Atomically reserve a per-user UTC-day AI request slot.
-- Advisory transaction locks serialize reservations for the same user and UTC day.
create or replace function public.reserve_ai_request_usage(
  p_user_id uuid,
  p_model text,
  p_max_output_tokens integer,
  p_daily_limit integer default 100
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  v_count bigint;
begin
  if p_user_id is null
    or p_model is null
    or length(p_model) = 0
    or p_max_output_tokens < 0
    or p_daily_limit < 1 then
    raise exception 'Invalid AI usage reservation arguments';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || v_day_start::date::text, 0)
  );

  select count(*)
    into v_count
    from public.ai_request_usage
   where user_id = p_user_id
     and created_at >= v_day_start
     and created_at < v_day_start + interval '1 day';

  if v_count >= p_daily_limit then
    return false;
  end if;

  insert into public.ai_request_usage (user_id, model, max_output_tokens)
  values (p_user_id, p_model, p_max_output_tokens);

  return true;
end;
$$;

revoke all on function public.reserve_ai_request_usage(uuid, text, integer, integer) from public;
revoke all on function public.reserve_ai_request_usage(uuid, text, integer, integer) from anon, authenticated;
grant execute on function public.reserve_ai_request_usage(uuid, text, integer, integer) to service_role;
