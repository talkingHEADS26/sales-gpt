alter table public.chat_sessions
  drop constraint if exists chat_sessions_session_type_check;

alter table public.chat_sessions
  add constraint chat_sessions_session_type_check
    check (session_type in ('full_sales', 'situation_coaching', 'appointment_setting'));

create table if not exists public.appointment_setting_kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  opening_score numeric(4,2),
  permission_score numeric(4,2),
  need_score numeric(4,2),
  benefit_score numeric(4,2),
  objection_score numeric(4,2),
  closing_score numeric(4,2),
  appointment_probability numeric(5,2),
  appointment_result text,
  is_appointment boolean,
  rationale text,
  final_feedback text,
  strengths jsonb,
  improvements jsonb,
  next_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_setting_kpi_snapshots_session_id_key unique (session_id),
  constraint appointment_setting_kpi_snapshots_opening_score_check
    check (opening_score is null or (opening_score >= 0 and opening_score <= 10)),
  constraint appointment_setting_kpi_snapshots_permission_score_check
    check (permission_score is null or (permission_score >= 0 and permission_score <= 10)),
  constraint appointment_setting_kpi_snapshots_need_score_check
    check (need_score is null or (need_score >= 0 and need_score <= 10)),
  constraint appointment_setting_kpi_snapshots_benefit_score_check
    check (benefit_score is null or (benefit_score >= 0 and benefit_score <= 10)),
  constraint appointment_setting_kpi_snapshots_objection_score_check
    check (objection_score is null or (objection_score >= 0 and objection_score <= 10)),
  constraint appointment_setting_kpi_snapshots_closing_score_check
    check (closing_score is null or (closing_score >= 0 and closing_score <= 10)),
  constraint appointment_setting_kpi_snapshots_appointment_probability_check
    check (
      appointment_probability is null or
      (appointment_probability >= 0 and appointment_probability <= 100)
    ),
  constraint appointment_setting_kpi_snapshots_appointment_result_check
    check (appointment_result in ('appointment', 'no_appointment') or appointment_result is null)
);

create index if not exists idx_appointment_setting_kpi_snapshots_user_created_at
  on public.appointment_setting_kpi_snapshots (user_id, created_at desc);

create trigger set_appointment_setting_kpi_snapshots_updated_at
before update on public.appointment_setting_kpi_snapshots
for each row
execute function public.update_updated_at_column();

alter table public.appointment_setting_kpi_snapshots enable row level security;

create policy "appointment_setting_kpi_snapshots_select_own"
on public.appointment_setting_kpi_snapshots
for select
to authenticated
using (auth.uid() = user_id);

create policy "appointment_setting_kpi_snapshots_insert_own"
on public.appointment_setting_kpi_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "appointment_setting_kpi_snapshots_update_own"
on public.appointment_setting_kpi_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

with ranked_appointment_sessions as (
  select
    id,
    row_number() over (
      partition by user_id
      order by updated_at desc, created_at desc, id desc
    ) as session_rank
  from public.chat_sessions
  where session_type = 'appointment_setting'
    and status = 'active'
)
update public.chat_sessions
set status = 'archived'
where id in (
  select id
  from ranked_appointment_sessions
  where session_rank > 1
);

create unique index if not exists idx_chat_sessions_single_active_appointment_setting
  on public.chat_sessions (user_id)
  where session_type = 'appointment_setting' and status = 'active';
