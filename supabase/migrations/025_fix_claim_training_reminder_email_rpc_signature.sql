drop function if exists public.claim_training_reminder_email(
  uuid,
  text,
  boolean,
  boolean,
  integer,
  timestamptz,
  jsonb,
  integer,
  integer
);

create or replace function public.claim_training_reminder_email(
  p_user_id uuid,
  p_email text,
  p_inactivity_triggered boolean,
  p_open_full_sales_triggered boolean,
  p_related_open_full_sales_count integer,
  p_last_known_activity_at timestamptz,
  p_reason_snapshot jsonb,
  p_cooldown_days integer
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

revoke all on function public.claim_training_reminder_email(
  uuid,
  text,
  boolean,
  boolean,
  integer,
  timestamptz,
  jsonb,
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
  integer
) to service_role;
