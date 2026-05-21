-- Sales GPT V1 schema
-- Initial database structure for users, organizations, subscriptions, chat sessions, and invitations.

create extension if not exists pgcrypto;
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check
    check (role in ('user', 'org_admin', 'master_admin'))
);
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  seat_limit integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_seat_limit_check
    check (seat_limit >= 1)
);
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_in_org text not null default 'member',
  created_at timestamptz not null default now(),
  constraint organization_members_organization_id_user_id_key
    unique (organization_id, user_id),
  constraint organization_members_role_in_org_check
    check (role_in_org in ('member', 'admin'))
);
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_key text not null,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_plan_key_check
    check (plan_key in ('solo', 'team_3', 'team_5', 'enterprise'))
);
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  session_type text not null,
  title text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_sessions_session_type_check
    check (session_type in ('full_sales', 'situation_coaching')),
  constraint chat_sessions_status_check
    check (status in ('active', 'completed', 'archived'))
);
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  sender_type text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_sender_type_check
    check (sender_type in ('user', 'assistant', 'system'))
);
create table if not exists public.session_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  closing_probability numeric(5,2),
  score_summary text,
  strengths text,
  weaknesses text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_scores_closing_probability_check
    check (
      closing_probability is null
      or (closing_probability >= 0 and closing_probability <= 100)
    )
);
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role_to_assign text not null default 'member',
  token text not null unique,
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitations_role_to_assign_check
    check (role_to_assign in ('member', 'admin'))
);
create index if not exists idx_organization_members_organization_id
  on public.organization_members (organization_id);
create index if not exists idx_organization_members_user_id
  on public.organization_members (user_id);
create index if not exists idx_subscriptions_organization_id
  on public.subscriptions (organization_id);
create index if not exists idx_subscriptions_plan_key
  on public.subscriptions (plan_key);
create index if not exists idx_subscriptions_status
  on public.subscriptions (status);
create index if not exists idx_chat_sessions_user_id
  on public.chat_sessions (user_id);
create index if not exists idx_chat_sessions_organization_id
  on public.chat_sessions (organization_id);
create index if not exists idx_chat_sessions_session_type
  on public.chat_sessions (session_type);
create index if not exists idx_chat_sessions_status
  on public.chat_sessions (status);
create index if not exists idx_chat_messages_session_id
  on public.chat_messages (session_id);
create index if not exists idx_session_scores_session_id
  on public.session_scores (session_id);
create index if not exists idx_invitations_organization_id
  on public.invitations (organization_id);
create index if not exists idx_invitations_email
  on public.invitations (email);
create index if not exists idx_invitations_token
  on public.invitations (token);
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at_column();
create trigger set_organizations_updated_at
before update on public.organizations
for each row
execute function public.update_updated_at_column();
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row
execute function public.update_updated_at_column();
create trigger set_chat_sessions_updated_at
before update on public.chat_sessions
for each row
execute function public.update_updated_at_column();
create trigger set_session_scores_updated_at
before update on public.session_scores
for each row
execute function public.update_updated_at_column();
