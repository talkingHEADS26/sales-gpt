-- Sales GPT V1 security bootstrap
-- Enables row level security and creates the initial auth.users -> profiles sync.

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.session_scores enable row level security;
alter table public.invitations enable row level security;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
create policy "chat_sessions_select_own"
on public.chat_sessions
for select
to authenticated
using (auth.uid() = user_id);
create policy "chat_sessions_insert_own"
on public.chat_sessions
for insert
to authenticated
with check (auth.uid() = user_id);
create policy "chat_sessions_update_own"
on public.chat_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
create policy "chat_messages_select_for_own_sessions"
on public.chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_sessions
    where public.chat_sessions.id = public.chat_messages.session_id
      and public.chat_sessions.user_id = auth.uid()
  )
);
create policy "chat_messages_insert_for_own_sessions"
on public.chat_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.chat_sessions
    where public.chat_sessions.id = public.chat_messages.session_id
      and public.chat_sessions.user_id = auth.uid()
  )
);
create policy "session_scores_select_for_own_sessions"
on public.session_scores
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_sessions
    where public.chat_sessions.id = public.session_scores.session_id
      and public.chat_sessions.user_id = auth.uid()
  )
);
create policy "organization_members_select_own"
on public.organization_members
for select
to authenticated
using (auth.uid() = user_id);
create policy "organizations_select_for_members"
on public.organizations
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members
    where public.organization_members.organization_id = public.organizations.id
      and public.organization_members.user_id = auth.uid()
  )
);
create policy "subscriptions_select_for_members"
on public.subscriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members
    where public.organization_members.organization_id = public.subscriptions.organization_id
      and public.organization_members.user_id = auth.uid()
  )
);
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, null, 'user')
  on conflict (id) do nothing;

  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();
