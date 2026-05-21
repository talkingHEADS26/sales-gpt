alter table public.full_sales_kpi_snapshots
  add column if not exists sale_result text,
  add column if not exists is_sale boolean;

alter table public.full_sales_kpi_snapshots
  drop constraint if exists full_sales_kpi_snapshots_sale_result_check,
  add constraint full_sales_kpi_snapshots_sale_result_check
    check (sale_result is null or sale_result in ('sale', 'no_sale'));
