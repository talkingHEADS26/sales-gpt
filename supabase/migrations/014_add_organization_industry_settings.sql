alter table public.organizations
  add column if not exists industry_key text not null default 'fitness',
  add column if not exists prompt_profile_key text,
  add column if not exists industry_locked boolean not null default true;

update public.organizations
set
  industry_key = coalesce(nullif(btrim(industry_key), ''), 'fitness'),
  prompt_profile_key = nullif(btrim(prompt_profile_key), '')
where industry_key is distinct from coalesce(nullif(btrim(industry_key), ''), 'fitness')
   or prompt_profile_key is distinct from nullif(btrim(prompt_profile_key), '');

alter table public.organizations
  drop constraint if exists organizations_industry_key_check,
  add constraint organizations_industry_key_check
    check (industry_key in ('fitness', 'automotive', 'insurance')),
  drop constraint if exists organizations_prompt_profile_key_not_blank_check,
  add constraint organizations_prompt_profile_key_not_blank_check
    check (prompt_profile_key is null or btrim(prompt_profile_key) <> '');

create index if not exists idx_organizations_industry_key
  on public.organizations (industry_key);
