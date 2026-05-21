alter table public.chat_sessions
  add column if not exists session_difficulty text,
  add column if not exists appointment_lead_source text,
  add column if not exists complaint_channel text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_sessions_session_difficulty_check'
  ) then
    alter table public.chat_sessions
      add constraint chat_sessions_session_difficulty_check
        check (
          session_difficulty is null
          or session_difficulty in ('easy', 'realistic', 'hard')
        );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_sessions_appointment_lead_source_check'
  ) then
    alter table public.chat_sessions
      add constraint chat_sessions_appointment_lead_source_check
        check (
          appointment_lead_source is null
          or appointment_lead_source in ('Webseite', 'Anzeige', 'Promo-Stand', 'Empfehlung')
        );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_sessions_complaint_channel_check'
  ) then
    alter table public.chat_sessions
      add constraint chat_sessions_complaint_channel_check
        check (
          complaint_channel is null
          or complaint_channel in ('vor Ort', 'Telefon', 'Empfang / Theke')
        );
  end if;
end $$;
