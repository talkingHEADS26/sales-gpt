-- Emergency hotfix: temporary access recovery for broken subscription state.
-- TODO: REMOVE AFTER SUBSCRIPTION DEBUGGING

update public.copecart_subscriptions
set
  subscription_status = 'active',
  current_period_paid_until = case
    when current_period_paid_until is not null
      and current_period_paid_until < now()
      then now() + interval '30 days'
    else current_period_paid_until
  end,
  updated_at = now()
where subscription_status in ('expired', 'payment_failed', 'past_due', 'cancelled');
