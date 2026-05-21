alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz;

do $$
declare
  v_user auth.users%rowtype;
begin
  select *
  into v_user
  from auth.users
  where lower(email) = 'io@abschluss-io.de'
  order by created_at asc
  limit 1;

  if v_user.id is null then
    raise warning 'Promotion skipped: user io@abschluss-io.de was not found in auth.users.';
    return;
  end if;

  insert into public.profiles (
    id,
    full_name,
    first_name,
    last_name,
    role,
    is_active
  )
  values (
    v_user.id,
    nullif(
      btrim(
        coalesce(v_user.raw_user_meta_data ->> 'first_name', '') || ' ' ||
        coalesce(v_user.raw_user_meta_data ->> 'last_name', '')
      ),
      ''
    ),
    nullif(btrim(v_user.raw_user_meta_data ->> 'first_name'), ''),
    nullif(btrim(v_user.raw_user_meta_data ->> 'last_name'), ''),
    'master_admin',
    true
  )
  on conflict (id) do update
  set role = 'master_admin',
      is_active = true,
      updated_at = now();

  raise notice 'Promoted io@abschluss-io.de (user id %) to master_admin with active platform access.', v_user.id;
end
$$;
