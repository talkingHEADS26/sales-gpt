


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."claim_training_reminder_email"("p_user_id" "uuid", "p_email" "text", "p_inactivity_triggered" boolean, "p_open_full_sales_triggered" boolean, "p_related_open_full_sales_count" integer, "p_last_known_activity_at" timestamp with time zone, "p_reason_snapshot" "jsonb", "p_cooldown_days" integer) RETURNS TABLE("claimed" boolean, "log_id" "uuid", "skip_reason" "text", "cooldown_until" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_last_sent_at timestamptz := null;
  v_pending_log_id uuid := null;
  v_inserted_log_id uuid := null;
begin
  if not p_inactivity_triggered and not p_open_full_sales_triggered then
    return query
    select false, null::uuid, 'no_trigger', null::timestamptz;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext('training_reminder_email:' || p_user_id::text));

  select training_reminder_email_log.id
  into v_pending_log_id
  from public.training_reminder_email_log
  where training_reminder_email_log.user_id = p_user_id
    and training_reminder_email_log.delivery_status = 'pending'
    and training_reminder_email_log.created_at >= now() - interval '30 minutes'
  order by training_reminder_email_log.created_at desc
  limit 1;

  if v_pending_log_id is not null then
    return query
    select false, v_pending_log_id, 'pending_exists', null::timestamptz;
    return;
  end if;

  select max(training_reminder_email_log.sent_at)
  into v_last_sent_at
  from public.training_reminder_email_log
  where training_reminder_email_log.user_id = p_user_id
    and training_reminder_email_log.delivery_status = 'sent';

  if v_last_sent_at is not null
    and v_last_sent_at > now() - make_interval(days => p_cooldown_days) then
    return query
    select
      false,
      null::uuid,
      'cooldown_active',
      v_last_sent_at + make_interval(days => p_cooldown_days);
    return;
  end if;

  insert into public.training_reminder_email_log (
    user_id,
    email,
    inactivity_triggered,
    open_full_sales_triggered,
    related_open_full_sales_count,
    last_known_activity_at,
    reason_snapshot,
    delivery_status
  )
  values (
    p_user_id,
    p_email,
    p_inactivity_triggered,
    p_open_full_sales_triggered,
    greatest(coalesce(p_related_open_full_sales_count, 0), 0),
    p_last_known_activity_at,
    coalesce(p_reason_snapshot, '{}'::jsonb),
    'pending'
  )
  returning training_reminder_email_log.id into v_inserted_log_id;

  return query
  select true, v_inserted_log_id, null::text, null::timestamptz;
end;
$$;


ALTER FUNCTION "public"."claim_training_reminder_email"("p_user_id" "uuid", "p_email" "text", "p_inactivity_triggered" boolean, "p_open_full_sales_triggered" boolean, "p_related_open_full_sales_count" integer, "p_last_known_activity_at" timestamp with time zone, "p_reason_snapshot" "jsonb", "p_cooldown_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compose_full_name"("p_first_name" "text", "p_last_name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select nullif(
    btrim(
      concat_ws(
        ' ',
        nullif(btrim(p_first_name), ''),
        nullif(btrim(p_last_name), '')
      )
    ),
    ''
  );
$$;


ALTER FUNCTION "public"."compose_full_name"("p_first_name" "text", "p_last_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_chat_session_with_monthly_limit"("p_user_id" "uuid", "p_organization_id" "uuid", "p_session_type" "text", "p_status" "text" DEFAULT 'draft'::"text", "p_title" "text" DEFAULT NULL::"text", "p_session_difficulty" "text" DEFAULT NULL::"text", "p_appointment_lead_source" "text" DEFAULT NULL::"text", "p_complaint_channel" "text" DEFAULT NULL::"text") RETURNS TABLE("success" boolean, "code" "text", "message" "text", "session_id" "uuid", "used_sessions" integer, "remaining_sessions" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."create_chat_session_with_monthly_limit"("p_user_id" "uuid", "p_organization_id" "uuid", "p_session_type" "text", "p_status" "text", "p_title" "text", "p_session_difficulty" "text", "p_appointment_lead_source" "text", "p_complaint_channel" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invitation_by_token"("p_token" "text") RETURNS TABLE("organization_id" "uuid", "organization_name" "text", "email" "text", "role_to_assign" "text", "expires_at" timestamp with time zone, "accepted_at" timestamp with time zone, "is_valid" boolean, "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_invitation public.invitations%rowtype;
  v_organization_name text;
begin
  select invitations.*
  into v_invitation
  from public.invitations
  where invitations.token = p_token;

  if not found then
    return query
    select
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::timestamptz,
      null::timestamptz,
      false,
      'Einladung nicht gefunden.';
    return;
  end if;

  select organizations.organization_name
  into v_organization_name
  from public.invitations
  join public.organizations
    on organizations.id = invitations.organization_id
  where invitations.token = p_token;

  if v_invitation.accepted_at is not null then
    return query
    select
      v_invitation.organization_id,
      v_organization_name,
      v_invitation.email,
      v_invitation.role_to_assign,
      v_invitation.expires_at,
      v_invitation.accepted_at,
      false,
      'Diese Einladung wurde bereits angenommen.';
    return;
  end if;

  if v_invitation.expires_at is not null and v_invitation.expires_at <= now() then
    return query
    select
      v_invitation.organization_id,
      v_organization_name,
      v_invitation.email,
      v_invitation.role_to_assign,
      v_invitation.expires_at,
      v_invitation.accepted_at,
      false,
      'Diese Einladung ist abgelaufen.';
    return;
  end if;

  return query
  select
    v_invitation.organization_id,
    v_organization_name,
    v_invitation.email,
    v_invitation.role_to_assign,
    v_invitation.expires_at,
    v_invitation.accepted_at,
    true,
    null::text;
end;
$$;


ALTER FUNCTION "public"."get_invitation_by_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_training_reminder_candidates"("p_inactivity_days" integer DEFAULT 4) RETURNS TABLE("user_id" "uuid", "first_name" "text", "profile_created_at" timestamp with time zone, "last_user_message_at" timestamp with time zone, "last_session_activity_at" timestamp with time zone, "last_known_activity_at" timestamp with time zone, "open_full_sales_count" integer, "inactivity_triggered" boolean, "open_full_sales_triggered" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with active_profiles as (
    select
      profiles.id,
      profiles.first_name,
      profiles.created_at
    from public.profiles
    where profiles.is_active = true
  ),
  user_message_activity as (
    select
      chat_sessions.user_id,
      max(chat_messages.created_at) as last_user_message_at
    from public.chat_messages
    join public.chat_sessions
      on chat_sessions.id = chat_messages.session_id
    where chat_messages.sender_type = 'user'
    group by chat_sessions.user_id
  ),
  session_activity as (
    select
      chat_sessions.user_id,
      max(greatest(chat_sessions.updated_at, chat_sessions.created_at)) as last_session_activity_at
    from public.chat_sessions
    group by chat_sessions.user_id
  ),
  open_full_sales as (
    select
      chat_sessions.user_id,
      count(*)::integer as open_full_sales_count
    from public.chat_sessions
    where chat_sessions.session_type = 'full_sales'
      and chat_sessions.status in ('active', 'draft', 'in_progress')
    group by chat_sessions.user_id
  ),
  resolved_activity as (
    select
      active_profiles.id as user_id,
      active_profiles.first_name,
      active_profiles.created_at as profile_created_at,
      user_message_activity.last_user_message_at,
      session_activity.last_session_activity_at,
      case
        when user_message_activity.last_user_message_at is not null
          and session_activity.last_session_activity_at is not null
          then greatest(
            user_message_activity.last_user_message_at,
            session_activity.last_session_activity_at
          )
        else coalesce(
          user_message_activity.last_user_message_at,
          session_activity.last_session_activity_at,
          active_profiles.created_at
        )
      end as last_known_activity_at,
      coalesce(open_full_sales.open_full_sales_count, 0) as open_full_sales_count
    from active_profiles
    left join user_message_activity
      on user_message_activity.user_id = active_profiles.id
    left join session_activity
      on session_activity.user_id = active_profiles.id
    left join open_full_sales
      on open_full_sales.user_id = active_profiles.id
  )
  select
    resolved_activity.user_id,
    resolved_activity.first_name,
    resolved_activity.profile_created_at,
    resolved_activity.last_user_message_at,
    resolved_activity.last_session_activity_at,
    resolved_activity.last_known_activity_at,
    resolved_activity.open_full_sales_count,
    resolved_activity.last_known_activity_at <= now() - make_interval(days => p_inactivity_days),
    resolved_activity.open_full_sales_count > 0
  from resolved_activity;
$$;


ALTER FUNCTION "public"."get_training_reminder_candidates"("p_inactivity_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_mode text := coalesce(new.raw_user_meta_data ->> 'registration_mode', 'basic');
  v_first_name text := nullif(btrim(new.raw_user_meta_data ->> 'first_name'), '');
  v_last_name text := nullif(btrim(new.raw_user_meta_data ->> 'last_name'), '');
  v_username text := nullif(btrim(new.raw_user_meta_data ->> 'username'), '');
  v_organization_name text := nullif(btrim(new.raw_user_meta_data ->> 'organization_name'), '');
  v_license_plan text := nullif(btrim(new.raw_user_meta_data ->> 'license_plan'), '');
  v_invitation_token text := nullif(btrim(new.raw_user_meta_data ->> 'invitation_token'), '');
  v_industry_key text := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'industry_key'), ''),
    'fitness'
  );
  v_franchise_vertical text := nullif(
    btrim(new.raw_user_meta_data ->> 'franchise_vertical'),
    ''
  );
  v_is_active boolean := true;
  v_role text := 'user';
  v_full_name text;
  v_organization_id uuid;
  v_invitation public.invitations%rowtype;
  v_member_count integer;
  v_seat_limit integer;
begin
  if v_mode not in ('basic', 'organization_signup', 'invitation_accept') then
    raise exception 'Unsupported registration mode: %', v_mode;
  end if;

  if v_mode in ('organization_signup', 'invitation_accept') then
    if v_first_name is null then
      raise exception 'first_name is required';
    end if;

    if v_last_name is null then
      raise exception 'last_name is required';
    end if;

    if v_username is null then
      raise exception 'username is required';
    end if;
  end if;

  if v_mode = 'organization_signup' then
    if v_organization_name is null then
      raise exception 'organization_name is required';
    end if;

    if v_license_plan is null then
      raise exception 'license_plan is required';
    end if;

    if v_industry_key not in ('fitness', 'finance', 'franchise', 'energy') then
      raise exception 'industry_key is invalid';
    end if;

    if v_industry_key = 'franchise' then
      v_franchise_vertical := coalesce(v_franchise_vertical, 'other');

      if v_franchise_vertical not in (
        'restaurant',
        'fashion',
        'fitness',
        'beauty',
        'retail',
        'services',
        'other'
      ) then
        raise exception 'franchise_vertical is invalid';
      end if;
    else
      v_franchise_vertical := null;
    end if;

    v_seat_limit := public.plan_seat_limit(v_license_plan);
    v_role := 'org_admin';
    v_is_active := true;
  elsif v_mode = 'basic' then
    v_is_active := true;
  elsif v_mode = 'invitation_accept' then
    if v_invitation_token is null then
      raise exception 'invitation_token is required';
    end if;
  end if;

  v_full_name := public.compose_full_name(v_first_name, v_last_name);

  insert into public.profiles (
    id,
    full_name,
    first_name,
    last_name,
    username,
    role,
    is_active
  )
  values (
    new.id,
    v_full_name,
    v_first_name,
    v_last_name,
    v_username,
    v_role,
    v_is_active
  )
  on conflict (id) do update
  set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    username = coalesce(excluded.username, public.profiles.username),
    role = excluded.role,
    is_active = coalesce(excluded.is_active, public.profiles.is_active),
    updated_at = now();

  if v_mode = 'organization_signup' then
    insert into public.organizations (
      organization_name,
      seat_limit,
      industry_key,
      prompt_profile_key,
      franchise_vertical
    )
    values (
      v_organization_name,
      v_seat_limit,
      v_industry_key,
      v_industry_key,
      v_franchise_vertical
    )
    returning id into v_organization_id;

    insert into public.organization_members (organization_id, user_id, role_in_org)
    values (v_organization_id, new.id, 'admin');

    insert into public.subscriptions (organization_id, plan_key, status)
    values (v_organization_id, v_license_plan, 'active');
  elsif v_mode = 'invitation_accept' then
    select *
    into v_invitation
    from public.invitations
    where token = v_invitation_token
    for update;

    if not found then
      raise exception 'Invitation not found';
    end if;

    if v_invitation.accepted_at is not null then
      raise exception 'Invitation already accepted';
    end if;

    if v_invitation.expires_at is not null and v_invitation.expires_at <= now() then
      raise exception 'Invitation expired';
    end if;

    if v_invitation.email is not null and lower(v_invitation.email) <> lower(new.email) then
      raise exception 'Invitation email does not match the signed up user';
    end if;

    select organizations.seat_limit
    into v_seat_limit
    from public.organizations
    where organizations.id = v_invitation.organization_id
    for update;

    select count(*)
    into v_member_count
    from public.organization_members
    where organization_members.organization_id = v_invitation.organization_id;

    if v_member_count >= v_seat_limit then
      raise exception 'No seats available for this organization';
    end if;

    insert into public.organization_members (organization_id, user_id, role_in_org)
    values (v_invitation.organization_id, new.id, v_invitation.role_to_assign);

    update public.invitations
    set accepted_at = now()
    where id = v_invitation.id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."master_admin_cleanup_sessions"("p_dry_run" boolean DEFAULT true) RETURNS TABLE("success" boolean, "dry_run" boolean, "deleted_sessions" integer, "kept_completed_sessions" integer, "kept_last_active_full_sales_sessions" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_deleted_sessions integer := 0;
  v_kept_completed_sessions integer := 0;
  v_kept_last_active_full_sales_sessions integer := 0;
begin
  select count(*)
  into v_kept_completed_sessions
  from public.chat_sessions
  where status = 'completed';

  with ranked_active_full_sales_sessions as (
    select
      id,
      row_number() over (
        partition by user_id
        order by updated_at desc, created_at desc, id desc
      ) as session_rank
    from public.chat_sessions
    where session_type = 'full_sales'
      and status in ('active', 'draft', 'in_progress')
  )
  select count(*)
  into v_kept_last_active_full_sales_sessions
  from ranked_active_full_sales_sessions
  where session_rank = 1;

  with ranked_active_full_sales_sessions as (
    select
      id,
      row_number() over (
        partition by user_id
        order by updated_at desc, created_at desc, id desc
      ) as session_rank
    from public.chat_sessions
    where session_type = 'full_sales'
      and status in ('active', 'draft', 'in_progress')
  ),
  kept_sessions as (
    select id
    from public.chat_sessions
    where status = 'completed'

    union

    select id
    from ranked_active_full_sales_sessions
    where session_rank = 1
  ),
  deletable_sessions as (
    select chat_sessions.id
    from public.chat_sessions
    left join kept_sessions
      on kept_sessions.id = chat_sessions.id
    where kept_sessions.id is null
  )
  select count(*)
  into v_deleted_sessions
  from deletable_sessions;

  if not p_dry_run and v_deleted_sessions > 0 then
    with ranked_active_full_sales_sessions as (
      select
        id,
        row_number() over (
          partition by user_id
          order by updated_at desc, created_at desc, id desc
        ) as session_rank
      from public.chat_sessions
      where session_type = 'full_sales'
        and status in ('active', 'draft', 'in_progress')
    ),
    kept_sessions as (
      select id
      from public.chat_sessions
      where status = 'completed'

      union

      select id
      from ranked_active_full_sales_sessions
      where session_rank = 1
    )
    delete from public.chat_sessions
    where id in (
      select chat_sessions.id
      from public.chat_sessions
      left join kept_sessions
        on kept_sessions.id = chat_sessions.id
      where kept_sessions.id is null
    );
  end if;

  return query
  select
    true,
    p_dry_run,
    v_deleted_sessions,
    v_kept_completed_sessions,
    v_kept_last_active_full_sales_sessions;
end;
$$;


ALTER FUNCTION "public"."master_admin_cleanup_sessions"("p_dry_run" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."plan_seat_limit"("p_plan_key" "text") RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
begin
  case p_plan_key
    when 'solo' then
      return 1;
    when 'team_3' then
      return 3;
    when 'team_5' then
      return 5;
    else
      raise exception 'Unsupported license plan: %', p_plan_key;
  end case;
end;
$$;


ALTER FUNCTION "public"."plan_seat_limit"("p_plan_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_session_audio_seconds"("p_session_id" "uuid", "p_user_id" "uuid", "p_audio_seconds" integer) RETURNS TABLE("success" boolean, "code" "text", "message" "text", "audio_seconds_used" integer, "remaining_audio_seconds" integer, "usage_limit_reached" boolean, "limit_reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."reserve_session_audio_seconds"("p_session_id" "uuid", "p_user_id" "uuid", "p_audio_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_industry_prompts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_industry_prompts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."appointment_setting_avatar_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "previous_avatar_snapshot_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "industry_key" "text" NOT NULL,
    "avatar_name" "text" NOT NULL,
    "avatar_gender" "text" NOT NULL,
    "avatar_age" integer NOT NULL,
    "avatar_job_situation" "text",
    "avatar_family_situation" "text",
    "avatar_time_budget" "text",
    "avatar_financial_budget" "text",
    "avatar_disc_type" "text",
    "avatar_difficulty" "text",
    "avatar_objections" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "lead_source" "text" NOT NULL,
    "lead_context" "text" NOT NULL,
    "lead_goal" "text" NOT NULL,
    "lead_tone" "text" NOT NULL,
    "opening_message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "appointment_setting_avatar_snapshots_avatar_age_check" CHECK ((("avatar_age" >= 20) AND ("avatar_age" <= 80))),
    CONSTRAINT "appointment_setting_avatar_snapshots_avatar_difficulty_check" CHECK ((("avatar_difficulty" IS NULL) OR ("avatar_difficulty" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text", 'almost_impossible'::"text"])))),
    CONSTRAINT "appointment_setting_avatar_snapshots_avatar_gender_check" CHECK (("avatar_gender" = ANY (ARRAY['male'::"text", 'female'::"text"])))
);


ALTER TABLE "public"."appointment_setting_avatar_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointment_setting_kpi_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "session_id" "uuid" NOT NULL,
    "opening_score" numeric(4,2),
    "permission_score" numeric(4,2),
    "need_score" numeric(4,2),
    "benefit_score" numeric(4,2),
    "objection_score" numeric(4,2),
    "closing_score" numeric(4,2),
    "appointment_probability" numeric(5,2),
    "appointment_result" "text",
    "is_appointment" boolean,
    "rationale" "text",
    "final_feedback" "text",
    "strengths" "jsonb",
    "improvements" "jsonb",
    "next_focus" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "feedback" "jsonb",
    CONSTRAINT "appointment_setting_kpi_snapshots_appointment_probability_check" CHECK ((("appointment_probability" IS NULL) OR (("appointment_probability" >= (0)::numeric) AND ("appointment_probability" <= (100)::numeric)))),
    CONSTRAINT "appointment_setting_kpi_snapshots_appointment_result_check" CHECK ((("appointment_result" = ANY (ARRAY['appointment'::"text", 'no_appointment'::"text"])) OR ("appointment_result" IS NULL))),
    CONSTRAINT "appointment_setting_kpi_snapshots_benefit_score_check" CHECK ((("benefit_score" IS NULL) OR (("benefit_score" >= (0)::numeric) AND ("benefit_score" <= (10)::numeric)))),
    CONSTRAINT "appointment_setting_kpi_snapshots_closing_score_check" CHECK ((("closing_score" IS NULL) OR (("closing_score" >= (0)::numeric) AND ("closing_score" <= (10)::numeric)))),
    CONSTRAINT "appointment_setting_kpi_snapshots_need_score_check" CHECK ((("need_score" IS NULL) OR (("need_score" >= (0)::numeric) AND ("need_score" <= (10)::numeric)))),
    CONSTRAINT "appointment_setting_kpi_snapshots_objection_score_check" CHECK ((("objection_score" IS NULL) OR (("objection_score" >= (0)::numeric) AND ("objection_score" <= (10)::numeric)))),
    CONSTRAINT "appointment_setting_kpi_snapshots_opening_score_check" CHECK ((("opening_score" IS NULL) OR (("opening_score" >= (0)::numeric) AND ("opening_score" <= (10)::numeric)))),
    CONSTRAINT "appointment_setting_kpi_snapshots_permission_score_check" CHECK ((("permission_score" IS NULL) OR (("permission_score" >= (0)::numeric) AND ("permission_score" <= (10)::numeric))))
);


ALTER TABLE "public"."appointment_setting_kpi_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "sender_type" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chat_messages_sender_type_check" CHECK (("sender_type" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "session_type" "text" NOT NULL,
    "title" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "current_module" integer DEFAULT 1 NOT NULL,
    "last_announced_module" integer DEFAULT 1 NOT NULL,
    "session_difficulty" "text",
    "appointment_lead_source" "text",
    "complaint_channel" "text",
    "audio_seconds_used" integer DEFAULT 0 NOT NULL,
    "usage_limit_reached" boolean DEFAULT false NOT NULL,
    "limit_reason" "text",
    CONSTRAINT "chat_sessions_appointment_lead_source_check" CHECK ((("appointment_lead_source" IS NULL) OR ("appointment_lead_source" = ANY (ARRAY['Webseite'::"text", 'Anzeige'::"text", 'Promo-Stand'::"text", 'Empfehlung'::"text"])))),
    CONSTRAINT "chat_sessions_audio_seconds_used_check" CHECK (("audio_seconds_used" >= 0)),
    CONSTRAINT "chat_sessions_complaint_channel_check" CHECK ((("complaint_channel" IS NULL) OR ("complaint_channel" = ANY (ARRAY['vor Ort'::"text", 'Telefon'::"text", 'Empfang / Theke'::"text"])))),
    CONSTRAINT "chat_sessions_current_module_check" CHECK ((("current_module" >= 1) AND ("current_module" <= 3))),
    CONSTRAINT "chat_sessions_last_announced_module_check" CHECK ((("last_announced_module" >= 1) AND ("last_announced_module" <= 3))),
    CONSTRAINT "chat_sessions_session_difficulty_check" CHECK ((("session_difficulty" IS NULL) OR ("session_difficulty" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text", 'almost_impossible'::"text"])))),
    CONSTRAINT "chat_sessions_session_type_check" CHECK (("session_type" = ANY (ARRAY['full_sales'::"text", 'situation_coaching'::"text", 'appointment_setting'::"text", 'complaint_management'::"text"]))),
    CONSTRAINT "chat_sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'archived'::"text", 'draft'::"text", 'in_progress'::"text"])))
);


ALTER TABLE "public"."chat_sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."chat_sessions"."current_module" IS 'Current training module: 1=Bedarfsermittlung, 2=Präsentation, 3=Einwandbehandlung';



CREATE TABLE IF NOT EXISTS "public"."complaint_management_avatar_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "previous_avatar_snapshot_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "industry_key" "text" NOT NULL,
    "avatar_name" "text" NOT NULL,
    "avatar_gender" "text" NOT NULL,
    "avatar_age" integer NOT NULL,
    "avatar_channel" "text" NOT NULL,
    "avatar_membership_context" "text" NOT NULL,
    "avatar_life_context" "text" NOT NULL,
    "avatar_complaint_topic" "text" NOT NULL,
    "avatar_complaint_context" "text" NOT NULL,
    "avatar_complaint_goal" "text" NOT NULL,
    "avatar_complaint_type" "text" NOT NULL,
    "avatar_persona_type" "text" NOT NULL,
    "avatar_complaint_history" "text" NOT NULL,
    "avatar_inner_amplifiers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "avatar_emotional_tone" "text" NOT NULL,
    "avatar_complaint_intensity" "text" NOT NULL,
    "opening_message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_job_situation" "text",
    "avatar_family_situation" "text",
    "avatar_time_budget" "text",
    "avatar_financial_budget" "text",
    "avatar_disc_type" "text",
    "avatar_difficulty" "text",
    "avatar_objections" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    CONSTRAINT "complaint_management_avatar_snapshots_avatar_age_check" CHECK ((("avatar_age" >= 18) AND ("avatar_age" <= 90))),
    CONSTRAINT "complaint_management_avatar_snapshots_avatar_channel_check" CHECK (("avatar_channel" = ANY (ARRAY['vor Ort'::"text", 'Telefon'::"text", 'Empfang / Theke'::"text"]))),
    CONSTRAINT "complaint_management_avatar_snapshots_avatar_complaint_intensit" CHECK (("avatar_complaint_intensity" = ANY (ARRAY['easy'::"text", 'realistisch'::"text", 'hart'::"text"]))),
    CONSTRAINT "complaint_management_avatar_snapshots_avatar_gender_check" CHECK (("avatar_gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'diverse'::"text"]))),
    CONSTRAINT "complaint_management_avatar_snapshots_industry_key_check" CHECK (("industry_key" = ANY (ARRAY['fitness'::"text", 'finance'::"text", 'franchise'::"text", 'energy'::"text"])))
);


ALTER TABLE "public"."complaint_management_avatar_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."complaint_management_kpi_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "session_id" "uuid" NOT NULL,
    "opening_score" numeric(4,2),
    "empathy_deescalation_score" numeric(4,2),
    "complaint_understanding_score" numeric(4,2),
    "responsibility_clarity_score" numeric(4,2),
    "resolution_orientation_score" numeric(4,2),
    "resolution_clarity_score" numeric(4,2),
    "resolution_probability" numeric(5,2),
    "complaint_result" "text",
    "customer_happy" "text",
    "is_resolved" boolean,
    "is_customer_happy" boolean,
    "rationale" "text",
    "final_feedback" "text",
    "strengths" "jsonb",
    "improvements" "jsonb",
    "next_focus" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "feedback" "jsonb",
    CONSTRAINT "complaint_management_kpi_snapshots_complaint_result_check" CHECK ((("complaint_result" = ANY (ARRAY['resolved'::"text", 'unresolved'::"text"])) OR ("complaint_result" IS NULL))),
    CONSTRAINT "complaint_management_kpi_snapshots_customer_happy_check" CHECK ((("customer_happy" = ANY (ARRAY['yes'::"text", 'no'::"text"])) OR ("customer_happy" IS NULL))),
    CONSTRAINT "complaint_management_kpi_snapshots_empathy_score_check" CHECK ((("empathy_deescalation_score" IS NULL) OR (("empathy_deescalation_score" >= (0)::numeric) AND ("empathy_deescalation_score" <= (10)::numeric)))),
    CONSTRAINT "complaint_management_kpi_snapshots_opening_score_check" CHECK ((("opening_score" IS NULL) OR (("opening_score" >= (0)::numeric) AND ("opening_score" <= (10)::numeric)))),
    CONSTRAINT "complaint_management_kpi_snapshots_resolution_clarity_score_che" CHECK ((("resolution_clarity_score" IS NULL) OR (("resolution_clarity_score" >= (0)::numeric) AND ("resolution_clarity_score" <= (10)::numeric)))),
    CONSTRAINT "complaint_management_kpi_snapshots_resolution_orientation_score" CHECK ((("resolution_orientation_score" IS NULL) OR (("resolution_orientation_score" >= (0)::numeric) AND ("resolution_orientation_score" <= (10)::numeric)))),
    CONSTRAINT "complaint_management_kpi_snapshots_resolution_probability_check" CHECK ((("resolution_probability" IS NULL) OR (("resolution_probability" >= (0)::numeric) AND ("resolution_probability" <= (100)::numeric)))),
    CONSTRAINT "complaint_management_kpi_snapshots_responsibility_score_check" CHECK ((("responsibility_clarity_score" IS NULL) OR (("responsibility_clarity_score" >= (0)::numeric) AND ("responsibility_clarity_score" <= (10)::numeric)))),
    CONSTRAINT "complaint_management_kpi_snapshots_understanding_score_check" CHECK ((("complaint_understanding_score" IS NULL) OR (("complaint_understanding_score" >= (0)::numeric) AND ("complaint_understanding_score" <= (10)::numeric))))
);


ALTER TABLE "public"."complaint_management_kpi_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."copecart_ipn_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_key" "text" NOT NULL,
    "raw_event_id" "text",
    "event_type" "text",
    "copecart_order_id" "text",
    "copecart_product_id" "text",
    "copecart_customer_email" "text",
    "amount" "text",
    "processing_status" "text" DEFAULT 'received'::"text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "copecart_ipn_events_status_check" CHECK (("processing_status" = ANY (ARRAY['received'::"text", 'processed'::"text", 'ignored'::"text", 'duplicate'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."copecart_ipn_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."copecart_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "organization_id" "uuid",
    "copecart_order_id" "text",
    "copecart_product_id" "text",
    "copecart_customer_email" "text",
    "subscription_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "last_payment_at" timestamp with time zone,
    "current_period_paid_until" timestamp with time zone,
    "last_ipn_event_at" timestamp with time zone,
    "last_event_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "grace_period_until" timestamp with time zone,
    "payment_failed_at" timestamp with time zone,
    "payment_failure_email_sent_at" timestamp with time zone,
    CONSTRAINT "copecart_subscriptions_status_check" CHECK (("subscription_status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'past_due'::"text", 'payment_failed'::"text", 'cancelled'::"text", 'refunded'::"text", 'chargeback'::"text", 'expired'::"text", 'unknown'::"text"]))),
    CONSTRAINT "copecart_subscriptions_target_check" CHECK (((("user_id" IS NOT NULL) AND ("organization_id" IS NULL)) OR (("user_id" IS NULL) AND ("organization_id" IS NOT NULL)) OR (("user_id" IS NOT NULL) AND ("organization_id" IS NOT NULL))))
);


ALTER TABLE "public"."copecart_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."full_sales_avatar_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "previous_avatar_snapshot_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "industry_key" "text" NOT NULL,
    "avatar_name" "text" NOT NULL,
    "avatar_gender" "text" NOT NULL,
    "avatar_age" integer NOT NULL,
    "avatar_life_stage" "text" NOT NULL,
    "avatar_profession_or_context" "text" NOT NULL,
    "avatar_primary_problem" "text" NOT NULL,
    "avatar_secondary_context" "text",
    "avatar_goal" "text" NOT NULL,
    "avatar_emotional_tone" "text" NOT NULL,
    "opening_message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_job_situation" "text",
    "avatar_family_situation" "text",
    "avatar_time_budget" "text",
    "avatar_financial_budget" "text",
    "avatar_disc_type" "text",
    "avatar_difficulty" "text",
    "avatar_objections" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    CONSTRAINT "full_sales_avatar_snapshots_avatar_age_check" CHECK ((("avatar_age" >= 18) AND ("avatar_age" <= 90))),
    CONSTRAINT "full_sales_avatar_snapshots_avatar_gender_check" CHECK (("avatar_gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'diverse'::"text"]))),
    CONSTRAINT "full_sales_avatar_snapshots_industry_key_check" CHECK (("industry_key" = ANY (ARRAY['fitness'::"text", 'finance'::"text", 'franchise'::"text", 'energy'::"text"])))
);


ALTER TABLE "public"."full_sales_avatar_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."full_sales_kpi_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "session_id" "uuid" NOT NULL,
    "module_1_score" numeric(5,2),
    "module_2_score" numeric(5,2),
    "module_3_score" numeric(5,2),
    "final_score" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "needs_analysis_score" numeric(4,2),
    "presentation_score" numeric(4,2),
    "objection_handling_score" numeric(4,2),
    "emotionality_score" numeric(4,2),
    "customer_understanding_score" numeric(4,2),
    "closing_probability_score" numeric(4,2),
    "final_feedback" "text",
    "strengths" "jsonb",
    "improvements" "jsonb",
    "next_focus" "text",
    "sale_result" "text",
    "is_sale" boolean,
    "feedback" "jsonb",
    CONSTRAINT "full_sales_kpi_snapshots_closing_probability_score_check" CHECK ((("closing_probability_score" IS NULL) OR (("closing_probability_score" >= (0)::numeric) AND ("closing_probability_score" <= (10)::numeric)))),
    CONSTRAINT "full_sales_kpi_snapshots_customer_understanding_score_check" CHECK ((("customer_understanding_score" IS NULL) OR (("customer_understanding_score" >= (0)::numeric) AND ("customer_understanding_score" <= (10)::numeric)))),
    CONSTRAINT "full_sales_kpi_snapshots_emotionality_score_check" CHECK ((("emotionality_score" IS NULL) OR (("emotionality_score" >= (0)::numeric) AND ("emotionality_score" <= (10)::numeric)))),
    CONSTRAINT "full_sales_kpi_snapshots_final_score_check" CHECK ((("final_score" IS NULL) OR (("final_score" >= (0)::numeric) AND ("final_score" <= (100)::numeric)))),
    CONSTRAINT "full_sales_kpi_snapshots_module_1_score_check" CHECK ((("module_1_score" IS NULL) OR (("module_1_score" >= (0)::numeric) AND ("module_1_score" <= (100)::numeric)))),
    CONSTRAINT "full_sales_kpi_snapshots_module_2_score_check" CHECK ((("module_2_score" IS NULL) OR (("module_2_score" >= (0)::numeric) AND ("module_2_score" <= (100)::numeric)))),
    CONSTRAINT "full_sales_kpi_snapshots_module_3_score_check" CHECK ((("module_3_score" IS NULL) OR (("module_3_score" >= (0)::numeric) AND ("module_3_score" <= (100)::numeric)))),
    CONSTRAINT "full_sales_kpi_snapshots_needs_analysis_score_check" CHECK ((("needs_analysis_score" IS NULL) OR (("needs_analysis_score" >= (0)::numeric) AND ("needs_analysis_score" <= (10)::numeric)))),
    CONSTRAINT "full_sales_kpi_snapshots_objection_handling_score_check" CHECK ((("objection_handling_score" IS NULL) OR (("objection_handling_score" >= (0)::numeric) AND ("objection_handling_score" <= (10)::numeric)))),
    CONSTRAINT "full_sales_kpi_snapshots_presentation_score_check" CHECK ((("presentation_score" IS NULL) OR (("presentation_score" >= (0)::numeric) AND ("presentation_score" <= (10)::numeric)))),
    CONSTRAINT "full_sales_kpi_snapshots_sale_result_check" CHECK ((("sale_result" IS NULL) OR ("sale_result" = ANY (ARRAY['sale'::"text", 'no_sale'::"text"]))))
);


ALTER TABLE "public"."full_sales_kpi_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."industry_prompts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "industry_key" "text" NOT NULL,
    "industry_name" "text" NOT NULL,
    "master_prompt" "text" NOT NULL,
    "avatar_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."industry_prompts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "email" "text",
    "role_to_assign" "text" DEFAULT 'member'::"text" NOT NULL,
    "token" "text" NOT NULL,
    "accepted_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "invitations_role_to_assign_check" CHECK (("role_to_assign" = ANY (ARRAY['member'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_in_org" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_members_role_in_org_check" CHECK (("role_in_org" = ANY (ARRAY['member'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_name" "text" NOT NULL,
    "seat_limit" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "industry_key" "text" DEFAULT 'fitness'::"text" NOT NULL,
    "prompt_profile_key" "text",
    "industry_locked" boolean DEFAULT true NOT NULL,
    "franchise_vertical" "text" DEFAULT 'other'::"text",
    CONSTRAINT "organizations_franchise_vertical_check" CHECK (("franchise_vertical" = ANY (ARRAY['restaurant'::"text", 'fashion'::"text", 'fitness'::"text", 'beauty'::"text", 'retail'::"text", 'services'::"text", 'other'::"text"]))),
    CONSTRAINT "organizations_industry_key_check" CHECK (("industry_key" = ANY (ARRAY['fitness'::"text", 'finance'::"text", 'franchise'::"text", 'energy'::"text"]))),
    CONSTRAINT "organizations_organization_name_not_blank_check" CHECK (("btrim"("organization_name") <> ''::"text")),
    CONSTRAINT "organizations_prompt_profile_key_not_blank_check" CHECK ((("prompt_profile_key" IS NULL) OR ("btrim"("prompt_profile_key") <> ''::"text"))),
    CONSTRAINT "organizations_seat_limit_check" CHECK (("seat_limit" >= 1))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "username" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "welcome_email_sent_at" timestamp with time zone,
    CONSTRAINT "profiles_first_name_not_blank_check" CHECK ((("first_name" IS NULL) OR ("btrim"("first_name") <> ''::"text"))),
    CONSTRAINT "profiles_last_name_not_blank_check" CHECK ((("last_name" IS NULL) OR ("btrim"("last_name") <> ''::"text"))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'org_admin'::"text", 'master_admin'::"text"]))),
    CONSTRAINT "profiles_username_not_blank_check" CHECK ((("username" IS NULL) OR ("btrim"("username") <> ''::"text")))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "closing_probability" numeric(5,2),
    "score_summary" "text",
    "strengths" "text",
    "weaknesses" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "session_scores_closing_probability_check" CHECK ((("closing_probability" IS NULL) OR (("closing_probability" >= (0)::numeric) AND ("closing_probability" <= (100)::numeric))))
);


ALTER TABLE "public"."session_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "plan_key" "text" NOT NULL,
    "status" "text" DEFAULT 'inactive'::"text" NOT NULL,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscriptions_plan_key_check" CHECK (("plan_key" = ANY (ARRAY['solo'::"text", 'team_3'::"text", 'team_5'::"text", 'enterprise'::"text", 'manual'::"text"]))),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['inactive'::"text", 'trialing'::"text", 'active'::"text", 'past_due'::"text", 'canceled'::"text", 'manual_active'::"text", 'manual_expired'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_event_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "severity" "text" NOT NULL,
    "source" "text" NOT NULL,
    "message" "text" NOT NULL,
    "metadata" "jsonb",
    "environment" "text",
    "organization_id" "uuid",
    "resolved_at" timestamp with time zone,
    "alert_sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "system_event_log_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'error'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."system_event_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."training_reminder_email_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text",
    "inactivity_triggered" boolean DEFAULT false NOT NULL,
    "open_full_sales_triggered" boolean DEFAULT false NOT NULL,
    "related_open_full_sales_count" integer DEFAULT 0 NOT NULL,
    "last_known_activity_at" timestamp with time zone,
    "resend_message_id" "text",
    "delivery_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_message" "text",
    "reason_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "training_reminder_email_log_delivery_status_check" CHECK (("delivery_status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"]))),
    CONSTRAINT "training_reminder_email_log_open_full_sales_count_check" CHECK (("related_open_full_sales_count" >= 0)),
    CONSTRAINT "training_reminder_email_log_reason_check" CHECK (("inactivity_triggered" OR "open_full_sales_triggered"))
);


ALTER TABLE "public"."training_reminder_email_log" OWNER TO "postgres";


ALTER TABLE ONLY "public"."appointment_setting_avatar_snapshots"
    ADD CONSTRAINT "appointment_setting_avatar_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointment_setting_avatar_snapshots"
    ADD CONSTRAINT "appointment_setting_avatar_snapshots_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."appointment_setting_kpi_snapshots"
    ADD CONSTRAINT "appointment_setting_kpi_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointment_setting_kpi_snapshots"
    ADD CONSTRAINT "appointment_setting_kpi_snapshots_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."complaint_management_avatar_snapshots"
    ADD CONSTRAINT "complaint_management_avatar_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."complaint_management_avatar_snapshots"
    ADD CONSTRAINT "complaint_management_avatar_snapshots_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."complaint_management_kpi_snapshots"
    ADD CONSTRAINT "complaint_management_kpi_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."complaint_management_kpi_snapshots"
    ADD CONSTRAINT "complaint_management_kpi_snapshots_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."copecart_ipn_events"
    ADD CONSTRAINT "copecart_ipn_events_event_key_key" UNIQUE ("event_key");



ALTER TABLE ONLY "public"."copecart_ipn_events"
    ADD CONSTRAINT "copecart_ipn_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."copecart_subscriptions"
    ADD CONSTRAINT "copecart_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."full_sales_avatar_snapshots"
    ADD CONSTRAINT "full_sales_avatar_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."full_sales_avatar_snapshots"
    ADD CONSTRAINT "full_sales_avatar_snapshots_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."full_sales_kpi_snapshots"
    ADD CONSTRAINT "full_sales_kpi_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."full_sales_kpi_snapshots"
    ADD CONSTRAINT "full_sales_kpi_snapshots_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."industry_prompts"
    ADD CONSTRAINT "industry_prompts_industry_key_key" UNIQUE ("industry_key");



ALTER TABLE ONLY "public"."industry_prompts"
    ADD CONSTRAINT "industry_prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_scores"
    ADD CONSTRAINT "session_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_event_log"
    ADD CONSTRAINT "system_event_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_reminder_email_log"
    ADD CONSTRAINT "training_reminder_email_log_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "copecart_subscriptions_order_id_unique" ON "public"."copecart_subscriptions" USING "btree" ("copecart_order_id") WHERE ("copecart_order_id" IS NOT NULL);



CREATE INDEX "idx_appointment_setting_avatar_snapshots_org_created_at" ON "public"."appointment_setting_avatar_snapshots" USING "btree" ("organization_id", "industry_key", "created_at" DESC);



CREATE INDEX "idx_appointment_setting_avatar_snapshots_user_created_at" ON "public"."appointment_setting_avatar_snapshots" USING "btree" ("user_id", "industry_key", "created_at" DESC);



CREATE INDEX "idx_appointment_setting_kpi_snapshots_user_created_at" ON "public"."appointment_setting_kpi_snapshots" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_chat_messages_session_id" ON "public"."chat_messages" USING "btree" ("session_id");



CREATE INDEX "idx_chat_messages_session_sender_created_at" ON "public"."chat_messages" USING "btree" ("session_id", "sender_type", "created_at" DESC);



CREATE INDEX "idx_chat_sessions_cleanup_active_full_sales_latest" ON "public"."chat_sessions" USING "btree" ("user_id", "updated_at" DESC, "created_at" DESC, "id" DESC) WHERE (("session_type" = 'full_sales'::"text") AND ("status" = ANY (ARRAY['active'::"text", 'draft'::"text", 'in_progress'::"text"])));



CREATE INDEX "idx_chat_sessions_cleanup_active_latest" ON "public"."chat_sessions" USING "btree" ("user_id", "updated_at" DESC, "created_at" DESC, "id" DESC) WHERE ("status" = ANY (ARRAY['active'::"text", 'draft'::"text", 'in_progress'::"text"]));



CREATE INDEX "idx_chat_sessions_current_module" ON "public"."chat_sessions" USING "btree" ("current_module");



CREATE INDEX "idx_chat_sessions_organization_id" ON "public"."chat_sessions" USING "btree" ("organization_id");



CREATE INDEX "idx_chat_sessions_session_type" ON "public"."chat_sessions" USING "btree" ("session_type");



CREATE UNIQUE INDEX "idx_chat_sessions_single_active_appointment_setting" ON "public"."chat_sessions" USING "btree" ("user_id") WHERE (("session_type" = 'appointment_setting'::"text") AND ("status" = 'active'::"text"));



CREATE UNIQUE INDEX "idx_chat_sessions_single_active_complaint_management" ON "public"."chat_sessions" USING "btree" ("user_id") WHERE (("session_type" = 'complaint_management'::"text") AND ("status" = 'active'::"text"));



CREATE UNIQUE INDEX "idx_chat_sessions_single_active_full_chat" ON "public"."chat_sessions" USING "btree" ("user_id") WHERE (("session_type" = 'situation_coaching'::"text") AND ("title" = '__full_chat__'::"text") AND ("status" = 'active'::"text"));



CREATE UNIQUE INDEX "idx_chat_sessions_single_active_full_sales" ON "public"."chat_sessions" USING "btree" ("user_id") WHERE (("session_type" = 'full_sales'::"text") AND ("status" = 'active'::"text"));



CREATE INDEX "idx_chat_sessions_status" ON "public"."chat_sessions" USING "btree" ("status");



CREATE INDEX "idx_chat_sessions_user_created_at" ON "public"."chat_sessions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_chat_sessions_user_id" ON "public"."chat_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_chat_sessions_user_type_status" ON "public"."chat_sessions" USING "btree" ("user_id", "session_type", "status");



CREATE INDEX "idx_complaint_management_avatar_snapshots_org_created_at" ON "public"."complaint_management_avatar_snapshots" USING "btree" ("organization_id", "industry_key", "created_at" DESC);



CREATE INDEX "idx_complaint_management_avatar_snapshots_user_created_at" ON "public"."complaint_management_avatar_snapshots" USING "btree" ("user_id", "industry_key", "created_at" DESC);



CREATE INDEX "idx_complaint_management_kpi_snapshots_user_created_at" ON "public"."complaint_management_kpi_snapshots" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_copecart_ipn_events_order_id" ON "public"."copecart_ipn_events" USING "btree" ("copecart_order_id");



CREATE INDEX "idx_copecart_ipn_events_received_at" ON "public"."copecart_ipn_events" USING "btree" ("received_at" DESC);



CREATE INDEX "idx_copecart_subscriptions_customer_email" ON "public"."copecart_subscriptions" USING "btree" ("copecart_customer_email");



CREATE INDEX "idx_copecart_subscriptions_grace_period_until" ON "public"."copecart_subscriptions" USING "btree" ("grace_period_until");



CREATE INDEX "idx_copecart_subscriptions_organization_id" ON "public"."copecart_subscriptions" USING "btree" ("organization_id");



CREATE INDEX "idx_copecart_subscriptions_paid_until" ON "public"."copecart_subscriptions" USING "btree" ("current_period_paid_until");



CREATE INDEX "idx_copecart_subscriptions_status" ON "public"."copecart_subscriptions" USING "btree" ("subscription_status");



CREATE INDEX "idx_copecart_subscriptions_user_id" ON "public"."copecart_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_full_sales_avatar_snapshots_org_created_at" ON "public"."full_sales_avatar_snapshots" USING "btree" ("organization_id", "industry_key", "created_at" DESC);



CREATE INDEX "idx_full_sales_avatar_snapshots_user_created_at" ON "public"."full_sales_avatar_snapshots" USING "btree" ("user_id", "industry_key", "created_at" DESC);



CREATE INDEX "idx_full_sales_kpi_snapshots_user_created_at" ON "public"."full_sales_kpi_snapshots" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_invitations_accepted_at" ON "public"."invitations" USING "btree" ("accepted_at");



CREATE INDEX "idx_invitations_email" ON "public"."invitations" USING "btree" ("email");



CREATE INDEX "idx_invitations_organization_id" ON "public"."invitations" USING "btree" ("organization_id");



CREATE INDEX "idx_invitations_token" ON "public"."invitations" USING "btree" ("token");



CREATE INDEX "idx_organization_members_organization_id" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_members_user_id" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_organizations_industry_key" ON "public"."organizations" USING "btree" ("industry_key");



CREATE INDEX "idx_organizations_is_active" ON "public"."organizations" USING "btree" ("is_active");



CREATE INDEX "idx_profiles_is_active" ON "public"."profiles" USING "btree" ("is_active");



CREATE UNIQUE INDEX "idx_profiles_username_lower_unique" ON "public"."profiles" USING "btree" ("lower"("username")) WHERE ("username" IS NOT NULL);



CREATE INDEX "idx_session_scores_session_id" ON "public"."session_scores" USING "btree" ("session_id");



CREATE INDEX "idx_subscriptions_organization_id" ON "public"."subscriptions" USING "btree" ("organization_id");



CREATE INDEX "idx_subscriptions_plan_key" ON "public"."subscriptions" USING "btree" ("plan_key");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_system_event_log_created_at" ON "public"."system_event_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_system_event_log_severity_created_at" ON "public"."system_event_log" USING "btree" ("severity", "created_at" DESC);



CREATE INDEX "idx_system_event_log_source_created_at" ON "public"."system_event_log" USING "btree" ("source", "created_at" DESC);



CREATE INDEX "idx_training_reminder_email_log_user_pending" ON "public"."training_reminder_email_log" USING "btree" ("user_id", "created_at" DESC) WHERE ("delivery_status" = 'pending'::"text");



CREATE INDEX "idx_training_reminder_email_log_user_sent_at" ON "public"."training_reminder_email_log" USING "btree" ("user_id", "sent_at" DESC) WHERE ("delivery_status" = 'sent'::"text");



CREATE OR REPLACE TRIGGER "set_appointment_setting_avatar_snapshots_updated_at" BEFORE UPDATE ON "public"."appointment_setting_avatar_snapshots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_appointment_setting_kpi_snapshots_updated_at" BEFORE UPDATE ON "public"."appointment_setting_kpi_snapshots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_chat_sessions_updated_at" BEFORE UPDATE ON "public"."chat_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_complaint_management_avatar_snapshots_updated_at" BEFORE UPDATE ON "public"."complaint_management_avatar_snapshots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_complaint_management_kpi_snapshots_updated_at" BEFORE UPDATE ON "public"."complaint_management_kpi_snapshots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_copecart_ipn_events_updated_at" BEFORE UPDATE ON "public"."copecart_ipn_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_copecart_subscriptions_updated_at" BEFORE UPDATE ON "public"."copecart_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_full_sales_avatar_snapshots_updated_at" BEFORE UPDATE ON "public"."full_sales_avatar_snapshots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_full_sales_kpi_snapshots_updated_at" BEFORE UPDATE ON "public"."full_sales_kpi_snapshots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_session_scores_updated_at" BEFORE UPDATE ON "public"."session_scores" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_training_reminder_email_log_updated_at" BEFORE UPDATE ON "public"."training_reminder_email_log" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_industry_prompts_updated_at" BEFORE UPDATE ON "public"."industry_prompts" FOR EACH ROW EXECUTE FUNCTION "public"."update_industry_prompts_updated_at"();



ALTER TABLE ONLY "public"."appointment_setting_avatar_snapshots"
    ADD CONSTRAINT "appointment_setting_avatar_sna_previous_avatar_snapshot_id_fkey" FOREIGN KEY ("previous_avatar_snapshot_id") REFERENCES "public"."appointment_setting_avatar_snapshots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointment_setting_avatar_snapshots"
    ADD CONSTRAINT "appointment_setting_avatar_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointment_setting_avatar_snapshots"
    ADD CONSTRAINT "appointment_setting_avatar_snapshots_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_setting_avatar_snapshots"
    ADD CONSTRAINT "appointment_setting_avatar_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_setting_kpi_snapshots"
    ADD CONSTRAINT "appointment_setting_kpi_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointment_setting_kpi_snapshots"
    ADD CONSTRAINT "appointment_setting_kpi_snapshots_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_setting_kpi_snapshots"
    ADD CONSTRAINT "appointment_setting_kpi_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."complaint_management_avatar_snapshots"
    ADD CONSTRAINT "complaint_management_avatar_sn_previous_avatar_snapshot_id_fkey" FOREIGN KEY ("previous_avatar_snapshot_id") REFERENCES "public"."complaint_management_avatar_snapshots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."complaint_management_avatar_snapshots"
    ADD CONSTRAINT "complaint_management_avatar_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."complaint_management_avatar_snapshots"
    ADD CONSTRAINT "complaint_management_avatar_snapshots_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."complaint_management_avatar_snapshots"
    ADD CONSTRAINT "complaint_management_avatar_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."complaint_management_kpi_snapshots"
    ADD CONSTRAINT "complaint_management_kpi_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."complaint_management_kpi_snapshots"
    ADD CONSTRAINT "complaint_management_kpi_snapshots_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."complaint_management_kpi_snapshots"
    ADD CONSTRAINT "complaint_management_kpi_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."copecart_subscriptions"
    ADD CONSTRAINT "copecart_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."copecart_subscriptions"
    ADD CONSTRAINT "copecart_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."full_sales_avatar_snapshots"
    ADD CONSTRAINT "full_sales_avatar_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."full_sales_avatar_snapshots"
    ADD CONSTRAINT "full_sales_avatar_snapshots_previous_avatar_snapshot_id_fkey" FOREIGN KEY ("previous_avatar_snapshot_id") REFERENCES "public"."full_sales_avatar_snapshots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."full_sales_avatar_snapshots"
    ADD CONSTRAINT "full_sales_avatar_snapshots_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."full_sales_avatar_snapshots"
    ADD CONSTRAINT "full_sales_avatar_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."full_sales_kpi_snapshots"
    ADD CONSTRAINT "full_sales_kpi_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."full_sales_kpi_snapshots"
    ADD CONSTRAINT "full_sales_kpi_snapshots_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."full_sales_kpi_snapshots"
    ADD CONSTRAINT "full_sales_kpi_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_scores"
    ADD CONSTRAINT "session_scores_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_event_log"
    ADD CONSTRAINT "system_event_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."training_reminder_email_log"
    ADD CONSTRAINT "training_reminder_email_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE "public"."appointment_setting_avatar_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appointment_setting_avatar_snapshots_insert_own" ON "public"."appointment_setting_avatar_snapshots" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "appointment_setting_avatar_snapshots_select_own" ON "public"."appointment_setting_avatar_snapshots" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "appointment_setting_avatar_snapshots_update_own" ON "public"."appointment_setting_avatar_snapshots" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."appointment_setting_kpi_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appointment_setting_kpi_snapshots_insert_own" ON "public"."appointment_setting_kpi_snapshots" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "appointment_setting_kpi_snapshots_select_own" ON "public"."appointment_setting_kpi_snapshots" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "appointment_setting_kpi_snapshots_update_own" ON "public"."appointment_setting_kpi_snapshots" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "authenticated users can read industry_prompts" ON "public"."industry_prompts" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_messages_insert_for_own_sessions" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chat_sessions"
  WHERE (("chat_sessions"."id" = "chat_messages"."session_id") AND ("chat_sessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "chat_messages_select_for_own_sessions" ON "public"."chat_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chat_sessions"
  WHERE (("chat_sessions"."id" = "chat_messages"."session_id") AND ("chat_sessions"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."chat_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_sessions_insert_own" ON "public"."chat_sessions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "chat_sessions_select_own" ON "public"."chat_sessions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "chat_sessions_update_own" ON "public"."chat_sessions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."complaint_management_avatar_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "complaint_management_avatar_snapshots_insert_own" ON "public"."complaint_management_avatar_snapshots" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "complaint_management_avatar_snapshots_select_own" ON "public"."complaint_management_avatar_snapshots" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "complaint_management_avatar_snapshots_update_own" ON "public"."complaint_management_avatar_snapshots" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."complaint_management_kpi_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "complaint_management_kpi_snapshots_insert_own" ON "public"."complaint_management_kpi_snapshots" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "complaint_management_kpi_snapshots_select_own" ON "public"."complaint_management_kpi_snapshots" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "complaint_management_kpi_snapshots_update_own" ON "public"."complaint_management_kpi_snapshots" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."copecart_ipn_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."copecart_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."full_sales_avatar_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "full_sales_avatar_snapshots_insert_own" ON "public"."full_sales_avatar_snapshots" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "full_sales_avatar_snapshots_select_own" ON "public"."full_sales_avatar_snapshots" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "full_sales_avatar_snapshots_update_own" ON "public"."full_sales_avatar_snapshots" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."full_sales_kpi_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "full_sales_kpi_snapshots_insert_own" ON "public"."full_sales_kpi_snapshots" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "full_sales_kpi_snapshots_select_own" ON "public"."full_sales_kpi_snapshots" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "full_sales_kpi_snapshots_update_own" ON "public"."full_sales_kpi_snapshots" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."industry_prompts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invitations_insert_for_org_admins" ON "public"."invitations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "invitations"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role_in_org" = 'admin'::"text")))));



CREATE POLICY "invitations_select_for_org_admins" ON "public"."invitations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "invitations"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role_in_org" = 'admin'::"text")))));



CREATE POLICY "invitations_update_for_org_admins" ON "public"."invitations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "invitations"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role_in_org" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "invitations"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role_in_org" = 'admin'::"text")))));



ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_members_select_own" ON "public"."organization_members" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_select_for_members" ON "public"."organizations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organizations"."id") AND ("organization_members"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."session_scores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_scores_select_for_own_sessions" ON "public"."session_scores" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chat_sessions"
  WHERE (("chat_sessions"."id" = "session_scores"."session_id") AND ("chat_sessions"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscriptions_select_for_members" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "subscriptions"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."system_event_log" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."claim_training_reminder_email"("p_user_id" "uuid", "p_email" "text", "p_inactivity_triggered" boolean, "p_open_full_sales_triggered" boolean, "p_related_open_full_sales_count" integer, "p_last_known_activity_at" timestamp with time zone, "p_reason_snapshot" "jsonb", "p_cooldown_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_training_reminder_email"("p_user_id" "uuid", "p_email" "text", "p_inactivity_triggered" boolean, "p_open_full_sales_triggered" boolean, "p_related_open_full_sales_count" integer, "p_last_known_activity_at" timestamp with time zone, "p_reason_snapshot" "jsonb", "p_cooldown_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."compose_full_name"("p_first_name" "text", "p_last_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."compose_full_name"("p_first_name" "text", "p_last_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."compose_full_name"("p_first_name" "text", "p_last_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_chat_session_with_monthly_limit"("p_user_id" "uuid", "p_organization_id" "uuid", "p_session_type" "text", "p_status" "text", "p_title" "text", "p_session_difficulty" "text", "p_appointment_lead_source" "text", "p_complaint_channel" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_chat_session_with_monthly_limit"("p_user_id" "uuid", "p_organization_id" "uuid", "p_session_type" "text", "p_status" "text", "p_title" "text", "p_session_difficulty" "text", "p_appointment_lead_source" "text", "p_complaint_channel" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invitation_by_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invitation_by_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invitation_by_token"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_training_reminder_candidates"("p_inactivity_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_training_reminder_candidates"("p_inactivity_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."master_admin_cleanup_sessions"("p_dry_run" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."master_admin_cleanup_sessions"("p_dry_run" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."plan_seat_limit"("p_plan_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."plan_seat_limit"("p_plan_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."plan_seat_limit"("p_plan_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reserve_session_audio_seconds"("p_session_id" "uuid", "p_user_id" "uuid", "p_audio_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reserve_session_audio_seconds"("p_session_id" "uuid", "p_user_id" "uuid", "p_audio_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_industry_prompts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_industry_prompts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_industry_prompts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."appointment_setting_avatar_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."appointment_setting_avatar_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."appointment_setting_avatar_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."appointment_setting_kpi_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."appointment_setting_kpi_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."appointment_setting_kpi_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."chat_sessions" TO "anon";
GRANT ALL ON TABLE "public"."chat_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."complaint_management_avatar_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."complaint_management_avatar_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."complaint_management_avatar_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."complaint_management_kpi_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."complaint_management_kpi_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."complaint_management_kpi_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."copecart_ipn_events" TO "anon";
GRANT ALL ON TABLE "public"."copecart_ipn_events" TO "authenticated";
GRANT ALL ON TABLE "public"."copecart_ipn_events" TO "service_role";



GRANT ALL ON TABLE "public"."copecart_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."copecart_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."copecart_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."full_sales_avatar_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."full_sales_avatar_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."full_sales_avatar_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."full_sales_kpi_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."full_sales_kpi_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."full_sales_kpi_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."industry_prompts" TO "anon";
GRANT ALL ON TABLE "public"."industry_prompts" TO "authenticated";
GRANT ALL ON TABLE "public"."industry_prompts" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."session_scores" TO "anon";
GRANT ALL ON TABLE "public"."session_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."session_scores" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."system_event_log" TO "anon";
GRANT ALL ON TABLE "public"."system_event_log" TO "authenticated";
GRANT ALL ON TABLE "public"."system_event_log" TO "service_role";



GRANT ALL ON TABLE "public"."training_reminder_email_log" TO "anon";
GRANT ALL ON TABLE "public"."training_reminder_email_log" TO "authenticated";
GRANT ALL ON TABLE "public"."training_reminder_email_log" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































