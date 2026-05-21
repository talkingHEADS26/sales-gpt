create table if not exists public.full_sales_avatar_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  previous_avatar_snapshot_id uuid references public.full_sales_avatar_snapshots(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  industry_key text not null,
  avatar_name text not null,
  avatar_gender text not null,
  avatar_age integer not null,
  avatar_life_stage text not null,
  avatar_profession_or_context text not null,
  avatar_primary_problem text not null,
  avatar_secondary_context text,
  avatar_goal text not null,
  avatar_emotional_tone text not null,
  opening_message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint full_sales_avatar_snapshots_session_id_key unique (session_id),
  constraint full_sales_avatar_snapshots_industry_key_check
    check (industry_key in ('fitness', 'automotive', 'insurance', 'physio', 'energy')),
  constraint full_sales_avatar_snapshots_avatar_gender_check
    check (avatar_gender in ('male', 'female', 'diverse')),
  constraint full_sales_avatar_snapshots_avatar_age_check
    check (avatar_age between 18 and 90)
);

create index if not exists idx_full_sales_avatar_snapshots_user_created_at
  on public.full_sales_avatar_snapshots (user_id, industry_key, created_at desc);

create index if not exists idx_full_sales_avatar_snapshots_org_created_at
  on public.full_sales_avatar_snapshots (organization_id, industry_key, created_at desc);

create trigger set_full_sales_avatar_snapshots_updated_at
before update on public.full_sales_avatar_snapshots
for each row
execute function public.update_updated_at_column();

alter table public.full_sales_avatar_snapshots enable row level security;

create policy "full_sales_avatar_snapshots_select_own"
on public.full_sales_avatar_snapshots
for select
to authenticated
using (auth.uid() = user_id);

create policy "full_sales_avatar_snapshots_insert_own"
on public.full_sales_avatar_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "full_sales_avatar_snapshots_update_own"
on public.full_sales_avatar_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
