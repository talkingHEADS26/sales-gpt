alter table public.profiles
  add column if not exists is_active boolean default true;

update public.profiles
set is_active = true
where is_active is null;

alter table public.profiles
  alter column is_active set default true;

alter table public.profiles
  alter column is_active set not null;

create index if not exists idx_profiles_is_active
  on public.profiles (is_active);
