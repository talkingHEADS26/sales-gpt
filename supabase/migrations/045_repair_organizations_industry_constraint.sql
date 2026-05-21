-- Repair organizations.industry_key values and re-apply the canonical check constraint.

update public.organizations
set industry_key = case
  when industry_key is null then 'fitness'
  when industry_key = 'automotive' then 'franchise'
  when industry_key = 'insurance' then 'finance'
  when industry_key = 'physio' then 'fitness'
  when industry_key in ('fitness', 'finance', 'franchise', 'energy') then industry_key
  else 'fitness'
end;

alter table public.organizations
  drop constraint if exists organizations_industry_key_check;

alter table public.organizations
  add constraint organizations_industry_key_check
  check (industry_key in ('fitness', 'finance', 'franchise', 'energy'));
