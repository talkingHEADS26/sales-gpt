alter table public.full_sales_kpi_snapshots
  add column if not exists needs_analysis_score numeric(4,2),
  add column if not exists presentation_score numeric(4,2),
  add column if not exists objection_handling_score numeric(4,2),
  add column if not exists emotionality_score numeric(4,2),
  add column if not exists customer_understanding_score numeric(4,2),
  add column if not exists closing_probability_score numeric(4,2),
  add column if not exists final_feedback text,
  add column if not exists strengths jsonb,
  add column if not exists improvements jsonb,
  add column if not exists next_focus text;

alter table public.full_sales_kpi_snapshots
  drop constraint if exists full_sales_kpi_snapshots_needs_analysis_score_check,
  add constraint full_sales_kpi_snapshots_needs_analysis_score_check
    check (
      needs_analysis_score is null or
      (needs_analysis_score >= 0 and needs_analysis_score <= 10)
    ),
  drop constraint if exists full_sales_kpi_snapshots_presentation_score_check,
  add constraint full_sales_kpi_snapshots_presentation_score_check
    check (
      presentation_score is null or
      (presentation_score >= 0 and presentation_score <= 10)
    ),
  drop constraint if exists full_sales_kpi_snapshots_objection_handling_score_check,
  add constraint full_sales_kpi_snapshots_objection_handling_score_check
    check (
      objection_handling_score is null or
      (objection_handling_score >= 0 and objection_handling_score <= 10)
    ),
  drop constraint if exists full_sales_kpi_snapshots_emotionality_score_check,
  add constraint full_sales_kpi_snapshots_emotionality_score_check
    check (
      emotionality_score is null or
      (emotionality_score >= 0 and emotionality_score <= 10)
    ),
  drop constraint if exists full_sales_kpi_snapshots_customer_understanding_score_check,
  add constraint full_sales_kpi_snapshots_customer_understanding_score_check
    check (
      customer_understanding_score is null or
      (customer_understanding_score >= 0 and customer_understanding_score <= 10)
    ),
  drop constraint if exists full_sales_kpi_snapshots_closing_probability_score_check,
  add constraint full_sales_kpi_snapshots_closing_probability_score_check
    check (
      closing_probability_score is null or
      (closing_probability_score >= 0 and closing_probability_score <= 10)
    );
