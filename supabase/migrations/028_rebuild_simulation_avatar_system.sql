update public.chat_sessions
set session_difficulty = 'medium'
where session_difficulty = 'realistic';

alter table public.chat_sessions
  drop constraint if exists chat_sessions_session_difficulty_check;

alter table public.chat_sessions
  add constraint chat_sessions_session_difficulty_check
    check (
      session_difficulty is null
      or session_difficulty in ('easy', 'medium', 'hard', 'almost_impossible')
    );

alter table public.full_sales_avatar_snapshots
  add column if not exists avatar_job_situation text,
  add column if not exists avatar_family_situation text,
  add column if not exists avatar_time_budget text,
  add column if not exists avatar_financial_budget text,
  add column if not exists avatar_disc_type text,
  add column if not exists avatar_difficulty text,
  add column if not exists avatar_objections jsonb not null default '[]'::jsonb;

alter table public.complaint_management_avatar_snapshots
  add column if not exists avatar_job_situation text,
  add column if not exists avatar_family_situation text,
  add column if not exists avatar_time_budget text,
  add column if not exists avatar_financial_budget text,
  add column if not exists avatar_disc_type text,
  add column if not exists avatar_difficulty text,
  add column if not exists avatar_objections jsonb not null default '[]'::jsonb;

create table if not exists public.appointment_setting_avatar_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  previous_avatar_snapshot_id uuid references public.appointment_setting_avatar_snapshots(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  industry_key text not null,
  avatar_name text not null,
  avatar_gender text not null,
  avatar_age integer not null,
  avatar_job_situation text,
  avatar_family_situation text,
  avatar_time_budget text,
  avatar_financial_budget text,
  avatar_disc_type text,
  avatar_difficulty text,
  avatar_objections jsonb not null default '[]'::jsonb,
  lead_source text not null,
  lead_context text not null,
  lead_goal text not null,
  lead_tone text not null,
  opening_message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_setting_avatar_snapshots_session_id_key unique (session_id),
  constraint appointment_setting_avatar_snapshots_avatar_gender_check
    check (avatar_gender in ('male', 'female')),
  constraint appointment_setting_avatar_snapshots_avatar_age_check
    check (avatar_age between 20 and 80),
  constraint appointment_setting_avatar_snapshots_avatar_difficulty_check
    check (
      avatar_difficulty is null
      or avatar_difficulty in ('easy', 'medium', 'hard', 'almost_impossible')
    )
);

create index if not exists idx_appointment_setting_avatar_snapshots_user_created_at
  on public.appointment_setting_avatar_snapshots (user_id, industry_key, created_at desc);

create index if not exists idx_appointment_setting_avatar_snapshots_org_created_at
  on public.appointment_setting_avatar_snapshots (organization_id, industry_key, created_at desc);

create trigger set_appointment_setting_avatar_snapshots_updated_at
before update on public.appointment_setting_avatar_snapshots
for each row
execute function public.update_updated_at_column();

alter table public.appointment_setting_avatar_snapshots enable row level security;

create policy "appointment_setting_avatar_snapshots_select_own"
on public.appointment_setting_avatar_snapshots
for select
to authenticated
using (auth.uid() = user_id);

create policy "appointment_setting_avatar_snapshots_insert_own"
on public.appointment_setting_avatar_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "appointment_setting_avatar_snapshots_update_own"
on public.appointment_setting_avatar_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
