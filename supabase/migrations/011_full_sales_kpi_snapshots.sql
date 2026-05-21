-- Store parsed KPI snapshots for full sales / full chat sessions without
-- changing prompts or training logic.

create table if not exists public.full_sales_kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  module_1_score numeric(5,2),
  module_2_score numeric(5,2),
  module_3_score numeric(5,2),
  final_score numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint full_sales_kpi_snapshots_session_id_key unique (session_id),
  constraint full_sales_kpi_snapshots_module_1_score_check
    check (module_1_score is null or (module_1_score >= 0 and module_1_score <= 100)),
  constraint full_sales_kpi_snapshots_module_2_score_check
    check (module_2_score is null or (module_2_score >= 0 and module_2_score <= 100)),
  constraint full_sales_kpi_snapshots_module_3_score_check
    check (module_3_score is null or (module_3_score >= 0 and module_3_score <= 100)),
  constraint full_sales_kpi_snapshots_final_score_check
    check (final_score is null or (final_score >= 0 and final_score <= 100))
);

create index if not exists idx_full_sales_kpi_snapshots_user_created_at
  on public.full_sales_kpi_snapshots (user_id, created_at desc);

create trigger set_full_sales_kpi_snapshots_updated_at
before update on public.full_sales_kpi_snapshots
for each row
execute function public.update_updated_at_column();

alter table public.full_sales_kpi_snapshots enable row level security;

create policy "full_sales_kpi_snapshots_select_own"
on public.full_sales_kpi_snapshots
for select
to authenticated
using (auth.uid() = user_id);

create policy "full_sales_kpi_snapshots_insert_own"
on public.full_sales_kpi_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "full_sales_kpi_snapshots_update_own"
on public.full_sales_kpi_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
