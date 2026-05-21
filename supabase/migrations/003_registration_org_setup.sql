-- Sales GPT V1 registration and invitation setup
-- Extends profile data, organization naming, invitation handling, and
-- enriches the auth.users bootstrap trigger with organization-aware logic.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists username text;
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name = 'name'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name = 'organization_name'
  ) then
    alter table public.organizations
      rename column name to organization_name;
  end if;
end;
$$;
alter table public.organizations
  alter column organization_name set not null;
alter table public.invitations
  alter column email drop not null;
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_not_blank_check'
  ) then
    alter table public.profiles
      add constraint profiles_username_not_blank_check
      check (username is null or btrim(username) <> '');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_first_name_not_blank_check'
  ) then
    alter table public.profiles
      add constraint profiles_first_name_not_blank_check
      check (first_name is null or btrim(first_name) <> '');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_last_name_not_blank_check'
  ) then
    alter table public.profiles
      add constraint profiles_last_name_not_blank_check
      check (last_name is null or btrim(last_name) <> '');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_organization_name_not_blank_check'
  ) then
    alter table public.organizations
      add constraint organizations_organization_name_not_blank_check
      check (btrim(organization_name) <> '');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_status_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_status_check
      check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled'));
  end if;
end;
$$;
create unique index if not exists idx_profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;
create index if not exists idx_invitations_accepted_at
  on public.invitations (accepted_at);
create or replace function public.plan_seat_limit(p_plan_key text)
returns integer
language plpgsql
immutable
as $$
begin
  case p_plan_key
    when 'solo' then
      return 1;
    when 'team_3' then
      return 3;
    when 'team_5' then
      return 5;
    else
      raise exception 'Unsupported license plan: %', p_plan_key;
  end case;
end;
$$;
create or replace function public.compose_full_name(
  p_first_name text,
  p_last_name text
)
returns text
language sql
immutable
as $$
  select nullif(
    btrim(
      concat_ws(
        ' ',
        nullif(btrim(p_first_name), ''),
        nullif(btrim(p_last_name), '')
      )
    ),
    ''
  );
$$;
create or replace function public.get_invitation_by_token(p_token text)
returns table (
  organization_id uuid,
  organization_name text,
  email text,
  role_to_assign text,
  expires_at timestamptz,
  accepted_at timestamptz,
  is_valid boolean,
  error_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations%rowtype;
  v_organization_name text;
begin
  select invitations.*
  into v_invitation
  from public.invitations
  where invitations.token = p_token;

  if not found then
    return query
    select
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::timestamptz,
      null::timestamptz,
      false,
      'Einladung nicht gefunden.';
    return;
  end if;

  select organizations.organization_name
  into v_organization_name
  from public.invitations
  join public.organizations
    on organizations.id = invitations.organization_id
  where invitations.token = p_token;

  if v_invitation.accepted_at is not null then
    return query
    select
      v_invitation.organization_id,
      v_organization_name,
      v_invitation.email,
      v_invitation.role_to_assign,
      v_invitation.expires_at,
      v_invitation.accepted_at,
      false,
      'Diese Einladung wurde bereits angenommen.';
    return;
  end if;

  if v_invitation.expires_at is not null and v_invitation.expires_at <= now() then
    return query
    select
      v_invitation.organization_id,
      v_organization_name,
      v_invitation.email,
      v_invitation.role_to_assign,
      v_invitation.expires_at,
      v_invitation.accepted_at,
      false,
      'Diese Einladung ist abgelaufen.';
    return;
  end if;

  return query
  select
    v_invitation.organization_id,
    v_organization_name,
    v_invitation.email,
    v_invitation.role_to_assign,
    v_invitation.expires_at,
    v_invitation.accepted_at,
    true,
    null::text;
end;
$$;
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
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'invitations'
      and policyname = 'invitations_select_for_org_admins'
  ) then
    create policy "invitations_select_for_org_admins"
    on public.invitations
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.organization_members
        where public.organization_members.organization_id = public.invitations.organization_id
          and public.organization_members.user_id = auth.uid()
          and public.organization_members.role_in_org = 'admin'
      )
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'invitations'
      and policyname = 'invitations_insert_for_org_admins'
  ) then
    create policy "invitations_insert_for_org_admins"
    on public.invitations
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.organization_members
        where public.organization_members.organization_id = public.invitations.organization_id
          and public.organization_members.user_id = auth.uid()
          and public.organization_members.role_in_org = 'admin'
      )
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'invitations'
      and policyname = 'invitations_update_for_org_admins'
  ) then
    create policy "invitations_update_for_org_admins"
    on public.invitations
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.organization_members
        where public.organization_members.organization_id = public.invitations.organization_id
          and public.organization_members.user_id = auth.uid()
          and public.organization_members.role_in_org = 'admin'
      )
    )
    with check (
      exists (
        select 1
        from public.organization_members
        where public.organization_members.organization_id = public.invitations.organization_id
          and public.organization_members.user_id = auth.uid()
          and public.organization_members.role_in_org = 'admin'
      )
    );
  end if;
end;
$$;
