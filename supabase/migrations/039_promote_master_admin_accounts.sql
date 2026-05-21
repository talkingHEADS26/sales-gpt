-- Emergency admin recovery: enforce master_admin role for existing platform admins.
-- TODO: REMOVE AFTER SUBSCRIPTION DEBUGGING

do $$
declare
  v_email text;
  v_user auth.users%rowtype;
begin
  foreach v_email in array array[
    'digital-marketing@talkingheads.academy',
    'io@abschluss-io.de'
  ]
  loop
    select *
    into v_user
    from auth.users
    where lower(email) = lower(v_email)
    order by created_at asc
    limit 1;

    if v_user.id is null then
      raise warning 'Promotion skipped: user % was not found in auth.users.', v_email;
      continue;
    end if;

    insert into public.profiles (
      id,
      full_name,
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
      'master_admin',
      true
    )
    on conflict (id) do update
    set role = 'master_admin',
        is_active = true,
        updated_at = now();

    raise notice 'Promoted % (user id %) to master_admin with active platform access.', v_email, v_user.id;
  end loop;
end
$$;
