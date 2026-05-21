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
  v_max_audio_seconds constant integer := 480;
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
      v_max_audio_seconds,
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
      v_max_audio_seconds,
      false,
      null::text;
    return;
  end if;

  if v_current_audio_seconds >= v_max_audio_seconds or v_usage_limit_reached then
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
      greatest(0, v_max_audio_seconds - v_current_audio_seconds),
      true,
      coalesce(v_limit_reason, 'session_audio_limit_reached');
    return;
  end if;

  if v_current_audio_seconds + p_audio_seconds > v_max_audio_seconds then
    return query
    select
      false,
      'SESSION_AUDIO_LIMIT_REACHED',
      'Das Audio-Limit dieser Session wurde erreicht.',
      v_current_audio_seconds,
      greatest(0, v_max_audio_seconds - v_current_audio_seconds),
      false,
      v_limit_reason;
    return;
  end if;

  v_new_audio_seconds := v_current_audio_seconds + p_audio_seconds;
  v_usage_limit_reached := v_new_audio_seconds >= v_max_audio_seconds;
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
    greatest(0, v_max_audio_seconds - v_new_audio_seconds),
    v_usage_limit_reached,
    v_limit_reason;
end;
$$;
