create table if not exists public.system_event_log (
  id uuid primary key default gen_random_uuid(),
  severity text not null,
  source text not null,
  message text not null,
  metadata jsonb,
  environment text,
  organization_id uuid references public.organizations(id) on delete set null,
  resolved_at timestamptz,
  alert_sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint system_event_log_severity_check
    check (severity in ('info', 'warning', 'error', 'critical'))
);

create index if not exists idx_system_event_log_created_at
  on public.system_event_log (created_at desc);

create index if not exists idx_system_event_log_source_created_at
  on public.system_event_log (source, created_at desc);

create index if not exists idx_system_event_log_severity_created_at
  on public.system_event_log (severity, created_at desc);

alter table public.system_event_log enable row level security;
