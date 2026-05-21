alter table public.copecart_subscriptions
  add column if not exists grace_period_until timestamptz,
  add column if not exists payment_failed_at timestamptz,
  add column if not exists payment_failure_email_sent_at timestamptz;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'copecart_subscriptions_status_check'
      and conrelid = 'public.copecart_subscriptions'::regclass
  ) then
    alter table public.copecart_subscriptions
      drop constraint copecart_subscriptions_status_check;
  end if;

  alter table public.copecart_subscriptions
    add constraint copecart_subscriptions_status_check
    check (
      subscription_status in (
        'pending',
        'active',
        'past_due',
        'payment_failed',
        'cancelled',
        'refunded',
        'chargeback',
        'expired',
        'unknown'
      )
    );
end;
$$;

create index if not exists idx_copecart_subscriptions_grace_period_until
  on public.copecart_subscriptions (grace_period_until);
