-- Ensure each user has at most one active full_sales session.
-- Older active full_sales sessions are archived before the unique index is added.

with ranked_full_sales_sessions as (
  select
    id,
    row_number() over (
      partition by user_id
      order by updated_at desc, created_at desc, id desc
    ) as session_rank
  from public.chat_sessions
  where session_type = 'full_sales'
    and status = 'active'
)
update public.chat_sessions
set status = 'archived'
where id in (
  select id
  from ranked_full_sales_sessions
  where session_rank > 1
);
create unique index if not exists idx_chat_sessions_single_active_full_sales
  on public.chat_sessions (user_id)
  where session_type = 'full_sales' and status = 'active';
