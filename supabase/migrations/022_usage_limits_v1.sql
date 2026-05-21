alter table public.chat_sessions
  drop constraint if exists chat_sessions_status_check;

alter table public.chat_sessions
  add constraint chat_sessions_status_check
    check (status in ('active', 'completed', 'archived', 'draft', 'in_progress'));

alter table public.chat_sessions
  add column if not exists audio_seconds_used integer not null default 0,
  add column if not exists usage_limit_reached boolean not null default false,
  add column if not exists limit_reason text;

alter table public.chat_sessions
  drop constraint if exists chat_sessions_audio_seconds_used_check;

alter table public.chat_sessions
  add constraint chat_sessions_audio_seconds_used_check
    check (audio_seconds_used >= 0);

create index if not exists idx_chat_sessions_user_created_at
  on public.chat_sessions (user_id, created_at desc);

create or replace function public.create_chat_session_with_monthly_limit(
  p_user_id uuid,
  p_organization_id uuid,
  p_session_type text,
  p_status text default 'draft',
  p_title text default null,
  p_session_difficulty text default null,
  p_appointment_lead_source text default null,
  p_complaint_channel text default null
)
returns table (
  success boolean,
  code text,
  message text,
  session_id uuid,
  used_sessions integer,
  remaining_sessions integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_month_start timestamptz :=
    (date_trunc('month', now() at time zone 'UTC') at time zone 'UTC');
  v_next_month_start timestamptz :=
    ((date_trunc('month', now() at time zone 'UTC') + interval '1 month') at time zone 'UTC');
  v_used_sessions integer := 0;
  v_session_id uuid := null;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select count(*)
  into v_used_sessions
  from public.chat_sessions
  where user_id = p_user_id
    and created_at >= v_current_month_start
    and created_at < v_next_month_start;

  if v_used_sessions >= 50 then
    return query
    select
      false,
      'MONTHLY_SESSION_LIMIT_REACHED',
      'Du hast dein monatliches Session-Limit erreicht.',
      null::uuid,
      v_used_sessions,
      0;
    return;
  end if;

  insert into public.chat_sessions (
    appointment_lead_source,
    complaint_channel,
    organization_id,
    session_difficulty,
    session_type,
    status,
    title,
    user_id
  )
  values (
    p_appointment_lead_source,
    p_complaint_channel,
    p_organization_id,
    p_session_difficulty,
    p_session_type,
    p_status,
    p_title,
    p_user_id
  )
  returning id into v_session_id;

  v_used_sessions := v_used_sessions + 1;

  return query
  select
    true,
    null::text,
    null::text,
    v_session_id,
    v_used_sessions,
    greatest(0, 50 - v_used_sessions);
end;
$$;

revoke all on function public.create_chat_session_with_monthly_limit(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
) from public;
revoke all on function public.create_chat_session_with_monthly_limit(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
) from anon;
revoke all on function public.create_chat_session_with_monthly_limit(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
) from authenticated;
grant execute on function public.create_chat_session_with_monthly_limit(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;

create or replace function public.reserve_session_audio_seconds(
  p_session_id uuid,
  p_user_id uuid,
  p_audio_seconds integer
)
returns table (
  success boolean,
  code text,
  message text,
  audio_seconds_used integer,
  remaining_audio_seconds integer,
  usage_limit_reached boolean,
  limit_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_audio_seconds integer := 0;
  v_new_audio_seconds integer := 0;
  v_limit_reason text := null;
  v_usage_limit_reached boolean := false;
begin
  if p_audio_seconds is null or p_audio_seconds <= 0 then
    return query
    select
      false,
      'INVALID_AUDIO_DURATION',
      'Die Audio-Dauer ist ungültig.',
      0,
      300,
      false,
      null::text;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_session_id::text));

  select
    chat_sessions.audio_seconds_used,
    chat_sessions.limit_reason,
    chat_sessions.usage_limit_reached
  into
    v_current_audio_seconds,
    v_limit_reason,
    v_usage_limit_reached
  from public.chat_sessions
  where id = p_session_id
    and user_id = p_user_id
  for update;

  if not found then
    return query
    select
      false,
      'SESSION_NOT_FOUND',
      'Session nicht gefunden.',
      0,
      300,
      false,
      null::text;
    return;
  end if;

  if v_current_audio_seconds >= 300 or v_usage_limit_reached then
    update public.chat_sessions
    set
      usage_limit_reached = true,
      limit_reason = coalesce(limit_reason, 'session_audio_limit_reached')
    where id = p_session_id;

    return query
    select
      false,
      'SESSION_AUDIO_LIMIT_REACHED',
      'Das Audio-Limit dieser Session wurde erreicht.',
      v_current_audio_seconds,
      greatest(0, 300 - v_current_audio_seconds),
      true,
      coalesce(v_limit_reason, 'session_audio_limit_reached');
    return;
  end if;

  if v_current_audio_seconds + p_audio_seconds > 300 then
    return query
    select
      false,
      'SESSION_AUDIO_LIMIT_REACHED',
      'Das Audio-Limit dieser Session wurde erreicht.',
      v_current_audio_seconds,
      greatest(0, 300 - v_current_audio_seconds),
      false,
      v_limit_reason;
    return;
  end if;

  v_new_audio_seconds := v_current_audio_seconds + p_audio_seconds;
  v_usage_limit_reached := v_new_audio_seconds >= 300;
  v_limit_reason := case
    when v_usage_limit_reached then 'session_audio_limit_reached'
    else null
  end;

  update public.chat_sessions
  set
    audio_seconds_used = v_new_audio_seconds,
    usage_limit_reached = v_usage_limit_reached,
    limit_reason = v_limit_reason
  where id = p_session_id;

  return query
  select
    true,
    null::text,
    null::text,
    v_new_audio_seconds,
    greatest(0, 300 - v_new_audio_seconds),
    v_usage_limit_reached,
    v_limit_reason;
end;
$$;

revoke all on function public.reserve_session_audio_seconds(uuid, uuid, integer)
  from public;
revoke all on function public.reserve_session_audio_seconds(uuid, uuid, integer)
  from anon;
revoke all on function public.reserve_session_audio_seconds(uuid, uuid, integer)
  from authenticated;
grant execute on function public.reserve_session_audio_seconds(uuid, uuid, integer)
  to service_role;
