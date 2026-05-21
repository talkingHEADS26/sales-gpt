alter table public.full_sales_kpi_snapshots
  add column if not exists feedback jsonb;

alter table public.appointment_setting_kpi_snapshots
  add column if not exists feedback jsonb;

alter table public.complaint_management_kpi_snapshots
  add column if not exists feedback jsonb;
