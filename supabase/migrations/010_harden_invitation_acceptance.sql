create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text := coalesce(new.raw_user_meta_data ->> 'registration_mode', 'basic');
  v_first_name text := nullif(btrim(new.raw_user_meta_data ->> 'first_name'), '');
  v_last_name text := nullif(btrim(new.raw_user_meta_data ->> 'last_name'), '');
  v_username text := nullif(btrim(new.raw_user_meta_data ->> 'username'), '');
  v_organization_name text := nullif(btrim(new.raw_user_meta_data ->> 'organization_name'), '');
  v_license_plan text := nullif(btrim(new.raw_user_meta_data ->> 'license_plan'), '');
  v_invitation_token text := nullif(btrim(new.raw_user_meta_data ->> 'invitation_token'), '');
  v_role text := 'user';
  v_full_name text;
  v_organization_id uuid;
  v_invitation public.invitations%rowtype;
  v_member_count integer;
  v_organization_is_active boolean;
  v_seat_limit integer;
begin
  if v_mode not in ('basic', 'organization_signup', 'invitation_accept') then
    raise exception 'Unsupported registration mode: %', v_mode;
  end if;

  if v_mode in ('organization_signup', 'invitation_accept') then
    if v_first_name is null then
      raise exception 'first_name is required';
    end if;

    if v_last_name is null then
      raise exception 'last_name is required';
    end if;

    if v_username is null then
      raise exception 'username is required';
    end if;
  end if;

  if v_mode = 'organization_signup' then
    if v_organization_name is null then
      raise exception 'organization_name is required';
    end if;

    if v_license_plan is null then
      raise exception 'license_plan is required';
    end if;

    v_seat_limit := public.plan_seat_limit(v_license_plan);
    v_role := 'org_admin';
  elsif v_mode = 'invitation_accept' then
    if v_invitation_token is null then
      raise exception 'invitation_token is required';
    end if;
  end if;

  v_full_name := public.compose_full_name(v_first_name, v_last_name);

  insert into public.profiles (
    id,
    full_name,
    first_name,
    last_name,
    username,
    role
  )
  values (
    new.id,
    v_full_name,
    v_first_name,
    v_last_name,
    v_username,
    v_role
  )
  on conflict (id) do update
  set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    username = coalesce(excluded.username, public.profiles.username),
    role = excluded.role,
    updated_at = now();

  if v_mode = 'organization_signup' then
    insert into public.organizations (organization_name, seat_limit)
    values (v_organization_name, v_seat_limit)
    returning id into v_organization_id;

    insert into public.organization_members (organization_id, user_id, role_in_org)
    values (v_organization_id, new.id, 'admin');

    insert into public.subscriptions (organization_id, plan_key, status)
    values (v_organization_id, v_license_plan, 'active');
  elsif v_mode = 'invitation_accept' then
    select *
    into v_invitation
    from public.invitations
    where token = v_invitation_token
    for update;

    if not found then
      raise exception 'Invitation not found';
    end if;

    if v_invitation.accepted_at is not null then
      raise exception 'Invitation already accepted';
    end if;

    if v_invitation.expires_at is not null and v_invitation.expires_at <= now() then
      raise exception 'Invitation expired';
    end if;

    if v_invitation.email is not null and lower(v_invitation.email) <> lower(new.email) then
      raise exception 'Invitation email does not match the signed up user';
    end if;

    select organizations.seat_limit, organizations.is_active
    into v_seat_limit, v_organization_is_active
    from public.organizations
    where organizations.id = v_invitation.organization_id
    for update;

    if not coalesce(v_organization_is_active, false) then
      raise exception 'Organization is inactive';
    end if;

    select count(*)
    into v_member_count
    from public.organization_members
    where organization_members.organization_id = v_invitation.organization_id;

    if v_member_count >= v_seat_limit then
      raise exception 'No seats available for this organization';
    end if;

    insert into public.organization_members (organization_id, user_id, role_in_org)
    values (v_invitation.organization_id, new.id, v_invitation.role_to_assign);

    update public.invitations
    set accepted_at = now()
    where id = v_invitation.id;
  end if;

  return new;
end;
$$;
