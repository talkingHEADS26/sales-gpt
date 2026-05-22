-- Enforce manual activation for self-signups while keeping organization signup active.

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
  v_industry_key text := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'industry_key'), ''),
    'fitness'
  );
  v_franchise_vertical text := nullif(
    btrim(new.raw_user_meta_data ->> 'franchise_vertical'),
    ''
  );
  v_is_active boolean := true;
  v_role text := 'user';
  v_full_name text;
  v_organization_id uuid;
  v_invitation public.invitations%rowtype;
  v_member_count integer;
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

    if v_industry_key not in ('fitness', 'finance', 'franchise', 'energy') then
      raise exception 'industry_key is invalid';
    end if;

    if v_industry_key = 'franchise' then
      v_franchise_vertical := coalesce(v_franchise_vertical, 'other');

      if v_franchise_vertical not in (
        'restaurant',
        'fashion',
        'fitness',
        'beauty',
        'retail',
        'services',
        'other'
      ) then
        raise exception 'franchise_vertical is invalid';
      end if;
    else
      v_franchise_vertical := null;
    end if;

    v_seat_limit := public.plan_seat_limit(v_license_plan);
    v_role := 'org_admin';
    v_is_active := true;
  elsif v_mode = 'basic' then
    -- Self-signup requires explicit manual activation by admin.
    v_is_active := false;
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
    role,
    is_active
  )
  values (
    new.id,
    v_full_name,
    v_first_name,
    v_last_name,
    v_username,
    v_role,
    v_is_active
  )
  on conflict (id) do update
  set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    username = coalesce(excluded.username, public.profiles.username),
    role = excluded.role,
    is_active = coalesce(excluded.is_active, public.profiles.is_active),
    updated_at = now();

  if v_mode = 'organization_signup' then
    insert into public.organizations (
      organization_name,
      seat_limit,
      industry_key,
      prompt_profile_key,
      franchise_vertical
    )
    values (
      v_organization_name,
      v_seat_limit,
      v_industry_key,
      v_industry_key,
      v_franchise_vertical
    )
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

    select organizations.seat_limit
    into v_seat_limit
    from public.organizations
    where organizations.id = v_invitation.organization_id
    for update;

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
