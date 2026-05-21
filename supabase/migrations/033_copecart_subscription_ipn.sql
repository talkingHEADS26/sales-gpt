create table if not exists public.copecart_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  copecart_order_id text,
  copecart_product_id text,
  copecart_customer_email text,
  subscription_status text not null default 'pending',
  last_payment_at timestamptz,
  current_period_paid_until timestamptz,
  last_ipn_event_at timestamptz,
  last_event_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint copecart_subscriptions_target_check
    check (
      (user_id is not null and organization_id is null)
      or (user_id is null and organization_id is not null)
      or (user_id is not null and organization_id is not null)
    ),
  constraint copecart_subscriptions_status_check
    check (
      subscription_status in (
        'pending',
        'active',
        'payment_failed',
        'cancelled',
        'refunded',
        'chargeback',
        'expired',
        'unknown'
      )
    )
);

create table if not exists public.copecart_ipn_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  raw_event_id text,
  event_type text,
  copecart_order_id text,
  copecart_product_id text,
  copecart_customer_email text,
  amount text,
  processing_status text not null default 'received',
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint copecart_ipn_events_status_check
    check (processing_status in ('received', 'processed', 'ignored', 'duplicate', 'failed'))
);

create unique index if not exists copecart_subscriptions_order_id_unique
  on public.copecart_subscriptions (copecart_order_id)
  where copecart_order_id is not null;

create index if not exists idx_copecart_subscriptions_user_id
  on public.copecart_subscriptions (user_id);

create index if not exists idx_copecart_subscriptions_organization_id
  on public.copecart_subscriptions (organization_id);

create index if not exists idx_copecart_subscriptions_status
  on public.copecart_subscriptions (subscription_status);

create index if not exists idx_copecart_subscriptions_paid_until
  on public.copecart_subscriptions (current_period_paid_until);

create index if not exists idx_copecart_subscriptions_customer_email
  on public.copecart_subscriptions (copecart_customer_email);

create index if not exists idx_copecart_ipn_events_order_id
  on public.copecart_ipn_events (copecart_order_id);

create index if not exists idx_copecart_ipn_events_received_at
  on public.copecart_ipn_events (received_at desc);

alter table public.copecart_subscriptions enable row level security;
alter table public.copecart_ipn_events enable row level security;

create trigger set_copecart_subscriptions_updated_at
before update on public.copecart_subscriptions
for each row
execute function public.update_updated_at_column();

create trigger set_copecart_ipn_events_updated_at
before update on public.copecart_ipn_events
for each row
execute function public.update_updated_at_column();

insert into public.copecart_subscriptions (
  user_id,
  organization_id,
  copecart_order_id,
  copecart_customer_email,
  subscription_status
)
select
  auth_users.id,
  organization_members.organization_id,
  nullif(btrim(auth_users.raw_user_meta_data ->> 'cope_cart_order_id'), ''),
  nullif(
    lower(
      btrim(
        coalesce(
          auth_users.raw_user_meta_data ->> 'cope_cart_customer_email',
          auth_users.email
        )
      )
    ),
    ''
  ),
  'pending'
from auth.users as auth_users
join public.organization_members
  on organization_members.user_id = auth_users.id
 and organization_members.role_in_org = 'admin'
where nullif(btrim(auth_users.raw_user_meta_data ->> 'cope_cart_order_id'), '') is not null
   or nullif(btrim(auth_users.raw_user_meta_data ->> 'cope_cart_customer_email'), '') is not null
on conflict (copecart_order_id)
  where copecart_order_id is not null
do nothing;
