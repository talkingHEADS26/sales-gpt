create table if not exists public.training_reminder_email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text,
  inactivity_triggered boolean not null default false,
  open_full_sales_triggered boolean not null default false,
  related_open_full_sales_count integer not null default 0,
  last_known_activity_at timestamptz,
  resend_message_id text,
  delivery_status text not null default 'pending',
  error_message text,
  reason_snapshot jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_reminder_email_log_delivery_status_check
    check (delivery_status in ('pending', 'sent', 'failed')),
  constraint training_reminder_email_log_reason_check
    check (inactivity_triggered or open_full_sales_triggered),
  constraint training_reminder_email_log_open_full_sales_count_check
    check (related_open_full_sales_count >= 0)
);

create index if not exists idx_training_reminder_email_log_user_sent_at
  on public.training_reminder_email_log (user_id, sent_at desc)
  where delivery_status = 'sent';

create index if not exists idx_training_reminder_email_log_user_pending
  on public.training_reminder_email_log (user_id, created_at desc)
  where delivery_status = 'pending';

create index if not exists idx_chat_sessions_user_type_status
  on public.chat_sessions (user_id, session_type, status);

create index if not exists idx_chat_messages_session_sender_created_at
  on public.chat_messages (session_id, sender_type, created_at desc);

drop trigger if exists set_training_reminder_email_log_updated_at
on public.training_reminder_email_log;

create trigger set_training_reminder_email_log_updated_at
before update on public.training_reminder_email_log
for each row
execute function public.update_updated_at_column();

create or replace function public.get_training_reminder_candidates(
  p_inactivity_days integer default 4
)
returns table (
  user_id uuid,
  first_name text,
  profile_created_at timestamptz,
  last_user_message_at timestamptz,
  last_session_activity_at timestamptz,
  last_known_activity_at timestamptz,
  open_full_sales_count integer,
  inactivity_triggered boolean,
  open_full_sales_triggered boolean
)
language sql
security definer
set search_path = public
as $$
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

create or replace function public.claim_training_reminder_email(
  p_user_id uuid,
  p_email text,
  p_inactivity_triggered boolean,
  p_open_full_sales_triggered boolean,
  p_related_open_full_sales_count integer default 0,
  p_last_known_activity_at timestamptz default null,
  p_reason_snapshot jsonb default '{}'::jsonb,
  p_cooldown_days integer default 4,
  p_pending_timeout_minutes integer default 30
)
returns table (
  claimed boolean,
  log_id uuid,
  skip_reason text,
  cooldown_until timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
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
    and training_reminder_email_log.created_at >= now() - make_interval(mins => p_pending_timeout_minutes)
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

revoke all on function public.get_training_reminder_candidates(integer) from public;
revoke all on function public.get_training_reminder_candidates(integer) from anon;
revoke all on function public.get_training_reminder_candidates(integer) from authenticated;
grant execute on function public.get_training_reminder_candidates(integer) to service_role;

revoke all on function public.claim_training_reminder_email(
  uuid,
  text,
  boolean,
  boolean,
  integer,
  timestamptz,
  jsonb,
  integer,
  integer
) from public;
revoke all on function public.claim_training_reminder_email(
  uuid,
  text,
  boolean,
  boolean,
  integer,
  timestamptz,
  jsonb,
  integer,
  integer
) from anon;
revoke all on function public.claim_training_reminder_email(
  uuid,
  text,
  boolean,
  boolean,
  integer,
  timestamptz,
  jsonb,
  integer,
  integer
) from authenticated;
grant execute on function public.claim_training_reminder_email(
  uuid,
  text,
  boolean,
  boolean,
  integer,
  timestamptz,
  jsonb,
  integer,
  integer
) to service_role;
