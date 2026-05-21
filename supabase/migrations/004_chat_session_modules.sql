-- Sales GPT training modules
-- Adds the current_module field required for modular full_sales training flows.

alter table public.chat_sessions
  add column if not exists current_module integer not null default 1;
update public.chat_sessions
set current_module = 1
where current_module is null;
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_sessions_current_module_check'
  ) then
    alter table public.chat_sessions
      add constraint chat_sessions_current_module_check
      check (current_module between 1 and 3);
  end if;
end;
$$;
