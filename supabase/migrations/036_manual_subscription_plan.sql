do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_plan_key_check'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      drop constraint subscriptions_plan_key_check;
  end if;

  alter table public.subscriptions
    add constraint subscriptions_plan_key_check
    check (plan_key in ('solo', 'team_3', 'team_5', 'enterprise', 'manual'));
end;
$$;
