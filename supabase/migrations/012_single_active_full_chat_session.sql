-- Ensure each user has at most one resumable Full Chat session.
-- Full Chat is stored as situation_coaching with the reserved __full_chat__ title.

with ranked_full_chat_sessions as (
  select
    id,
    row_number() over (
      partition by user_id
      order by updated_at desc, created_at desc, id desc
    ) as session_rank
  from public.chat_sessions
  where session_type = 'situation_coaching'
    and title = '__full_chat__'
    and status = 'active'
)
update public.chat_sessions
set status = 'archived'
where id in (
  select id
  from ranked_full_chat_sessions
  where session_rank > 1
);

create unique index if not exists idx_chat_sessions_single_active_full_chat
  on public.chat_sessions (user_id)
  where session_type = 'situation_coaching'
    and title = '__full_chat__'
    and status = 'active';
