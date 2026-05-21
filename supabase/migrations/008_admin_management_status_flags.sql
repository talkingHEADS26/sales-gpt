-- AbschlussIO admin management status flags
-- Adds lightweight active/inactive markers for platform-level administration.

alter table public.profiles
  add column if not exists is_active boolean not null default true;

alter table public.organizations
  add column if not exists is_active boolean not null default true;

create index if not exists idx_profiles_is_active
  on public.profiles (is_active);

create index if not exists idx_organizations_is_active
  on public.organizations (is_active);
