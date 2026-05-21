do $$
declare
  v_user_id uuid;
begin
  select id
  into v_user_id
  from auth.users
  where lower(email) = 'io@abschluss-io.de'
  order by created_at asc
  limit 1;

  if v_user_id is null then
    raise warning 'Promotion skipped: user io@abschluss-io.de was not found in auth.users.';
    return;
  end if;

  update public.profiles
  set role = 'master_admin',
      is_active = true,
      updated_at = now()
  where id = v_user_id;

  if not found then
    raise warning 'Promotion skipped: profile for io@abschluss-io.de (user id %) was not found.', v_user_id;
    return;
  end if;

  raise notice 'Promoted io@abschluss-io.de (user id %) to master_admin.', v_user_id;
end
$$;
