create or replace function public.master_admin_cleanup_sessions(p_dry_run boolean default true)
returns table (
  success boolean,
  dry_run boolean,
  deleted_sessions integer,
  kept_completed_sessions integer,
  kept_last_active_sessions integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_sessions integer := 0;
  v_kept_completed_sessions integer := 0;
  v_kept_last_active_sessions integer := 0;
begin
  select count(*)
  into v_kept_completed_sessions
  from public.chat_sessions
  where status = 'completed';

  with ranked_active_sessions as (
    select
      id,
      row_number() over (
        partition by user_id
        order by updated_at desc, created_at desc, id desc
      ) as session_rank
    from public.chat_sessions
    where status in ('active', 'draft', 'in_progress')
  )
  select count(*)
  into v_kept_last_active_sessions
  from ranked_active_sessions
  where session_rank = 1;

  with ranked_active_sessions as (
    select
      id,
      row_number() over (
        partition by user_id
        order by updated_at desc, created_at desc, id desc
      ) as session_rank
    from public.chat_sessions
    where status in ('active', 'draft', 'in_progress')
  ),
  kept_sessions as (
    select id
    from public.chat_sessions
    where status = 'completed'

    union

    select id
    from ranked_active_sessions
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
    with ranked_active_sessions as (
      select
        id,
        row_number() over (
          partition by user_id
          order by updated_at desc, created_at desc, id desc
        ) as session_rank
      from public.chat_sessions
      where status in ('active', 'draft', 'in_progress')
    ),
    kept_sessions as (
      select id
      from public.chat_sessions
      where status = 'completed'

      union

      select id
      from ranked_active_sessions
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
    v_kept_last_active_sessions;
end;
$$;

revoke all on function public.master_admin_cleanup_sessions(boolean) from public;
revoke all on function public.master_admin_cleanup_sessions(boolean) from anon;
revoke all on function public.master_admin_cleanup_sessions(boolean) from authenticated;
grant execute on function public.master_admin_cleanup_sessions(boolean) to service_role;

create index if not exists idx_chat_sessions_cleanup_active_latest
  on public.chat_sessions (user_id, updated_at desc, created_at desc, id desc)
  where status in ('active', 'draft', 'in_progress');
