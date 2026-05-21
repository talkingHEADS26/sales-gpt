create unique index if not exists copecart_subscriptions_order_id_unique
  on public.copecart_subscriptions (copecart_order_id)
  where copecart_order_id is not null;
