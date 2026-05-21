do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_status_check'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      drop constraint subscriptions_status_check;
  end if;
end;
$$;

alter table public.subscriptions
  add constraint subscriptions_status_check
  check (
    status in (
      'inactive',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'manual_active',
      'manual_expired'
    )
  );
