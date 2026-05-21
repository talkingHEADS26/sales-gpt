alter table public.chat_sessions
  drop constraint if exists chat_sessions_session_type_check;

alter table public.chat_sessions
  add constraint chat_sessions_session_type_check
    check (
      session_type in (
        'full_sales',
        'situation_coaching',
        'appointment_setting',
        'complaint_management'
      )
    );

create table if not exists public.complaint_management_avatar_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  previous_avatar_snapshot_id uuid references public.complaint_management_avatar_snapshots(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  industry_key text not null,
  avatar_name text not null,
  avatar_gender text not null,
  avatar_age integer not null,
  avatar_channel text not null,
  avatar_membership_context text not null,
  avatar_life_context text not null,
  avatar_complaint_topic text not null,
  avatar_complaint_context text not null,
  avatar_complaint_goal text not null,
  avatar_complaint_type text not null,
  avatar_persona_type text not null,
  avatar_complaint_history text not null,
  avatar_inner_amplifiers jsonb not null default '[]'::jsonb,
  avatar_emotional_tone text not null,
  avatar_complaint_intensity text not null,
  opening_message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_management_avatar_snapshots_session_id_key unique (session_id),
  constraint complaint_management_avatar_snapshots_industry_key_check
    check (industry_key in ('fitness', 'automotive', 'insurance', 'physio', 'energy')),
  constraint complaint_management_avatar_snapshots_avatar_gender_check
    check (avatar_gender in ('male', 'female', 'diverse')),
  constraint complaint_management_avatar_snapshots_avatar_age_check
    check (avatar_age between 18 and 90),
  constraint complaint_management_avatar_snapshots_avatar_channel_check
    check (avatar_channel in ('vor Ort', 'Telefon', 'Empfang / Theke')),
  constraint complaint_management_avatar_snapshots_avatar_complaint_intensity_check
    check (avatar_complaint_intensity in ('easy', 'realistisch', 'hart'))
);

create index if not exists idx_complaint_management_avatar_snapshots_user_created_at
  on public.complaint_management_avatar_snapshots (user_id, industry_key, created_at desc);

create index if not exists idx_complaint_management_avatar_snapshots_org_created_at
  on public.complaint_management_avatar_snapshots (organization_id, industry_key, created_at desc);

create trigger set_complaint_management_avatar_snapshots_updated_at
before update on public.complaint_management_avatar_snapshots
for each row
execute function public.update_updated_at_column();

alter table public.complaint_management_avatar_snapshots enable row level security;

create policy "complaint_management_avatar_snapshots_select_own"
on public.complaint_management_avatar_snapshots
for select
to authenticated
using (auth.uid() = user_id);

create policy "complaint_management_avatar_snapshots_insert_own"
on public.complaint_management_avatar_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "complaint_management_avatar_snapshots_update_own"
on public.complaint_management_avatar_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.complaint_management_kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  opening_score numeric(4,2),
  empathy_deescalation_score numeric(4,2),
  complaint_understanding_score numeric(4,2),
  responsibility_clarity_score numeric(4,2),
  resolution_orientation_score numeric(4,2),
  resolution_clarity_score numeric(4,2),
  resolution_probability numeric(5,2),
  complaint_result text,
  customer_happy text,
  is_resolved boolean,
  is_customer_happy boolean,
  rationale text,
  final_feedback text,
  strengths jsonb,
  improvements jsonb,
  next_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaint_management_kpi_snapshots_session_id_key unique (session_id),
  constraint complaint_management_kpi_snapshots_opening_score_check
    check (opening_score is null or (opening_score >= 0 and opening_score <= 10)),
  constraint complaint_management_kpi_snapshots_empathy_score_check
    check (
      empathy_deescalation_score is null or
      (empathy_deescalation_score >= 0 and empathy_deescalation_score <= 10)
    ),
  constraint complaint_management_kpi_snapshots_understanding_score_check
    check (
      complaint_understanding_score is null or
      (complaint_understanding_score >= 0 and complaint_understanding_score <= 10)
    ),
  constraint complaint_management_kpi_snapshots_responsibility_score_check
    check (
      responsibility_clarity_score is null or
      (responsibility_clarity_score >= 0 and responsibility_clarity_score <= 10)
    ),
  constraint complaint_management_kpi_snapshots_resolution_orientation_score_check
    check (
      resolution_orientation_score is null or
      (resolution_orientation_score >= 0 and resolution_orientation_score <= 10)
    ),
  constraint complaint_management_kpi_snapshots_resolution_clarity_score_check
    check (
      resolution_clarity_score is null or
      (resolution_clarity_score >= 0 and resolution_clarity_score <= 10)
    ),
  constraint complaint_management_kpi_snapshots_resolution_probability_check
    check (
      resolution_probability is null or
      (resolution_probability >= 0 and resolution_probability <= 100)
    ),
  constraint complaint_management_kpi_snapshots_complaint_result_check
    check (
      complaint_result in ('resolved', 'unresolved') or complaint_result is null
    ),
  constraint complaint_management_kpi_snapshots_customer_happy_check
    check (customer_happy in ('yes', 'no') or customer_happy is null)
);

create index if not exists idx_complaint_management_kpi_snapshots_user_created_at
  on public.complaint_management_kpi_snapshots (user_id, created_at desc);

create trigger set_complaint_management_kpi_snapshots_updated_at
before update on public.complaint_management_kpi_snapshots
for each row
execute function public.update_updated_at_column();

alter table public.complaint_management_kpi_snapshots enable row level security;

create policy "complaint_management_kpi_snapshots_select_own"
on public.complaint_management_kpi_snapshots
for select
to authenticated
using (auth.uid() = user_id);

create policy "complaint_management_kpi_snapshots_insert_own"
on public.complaint_management_kpi_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "complaint_management_kpi_snapshots_update_own"
on public.complaint_management_kpi_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

with ranked_complaint_management_sessions as (
  select
    id,
    row_number() over (
      partition by user_id
      order by updated_at desc, created_at desc, id desc
    ) as session_rank
  from public.chat_sessions
  where session_type = 'complaint_management'
    and status = 'active'
)
update public.chat_sessions
set status = 'archived'
where id in (
  select id
  from ranked_complaint_management_sessions
  where session_rank > 1
);

create unique index if not exists idx_chat_sessions_single_active_complaint_management
  on public.chat_sessions (user_id)
  where session_type = 'complaint_management' and status = 'active';
