-- Track which full_sales module has already been announced in a session.
-- This allows exactly one transition message per module switch.

alter table public.chat_sessions
  add column if not exists last_announced_module integer not null default 1;
update public.chat_sessions
set last_announced_module = coalesce(last_announced_module, current_module, 1)
where last_announced_module is null;
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_sessions_last_announced_module_check'
  ) then
    alter table public.chat_sessions
      add constraint chat_sessions_last_announced_module_check
      check (last_announced_module between 1 and 3);
  end if;
end;
$$;
