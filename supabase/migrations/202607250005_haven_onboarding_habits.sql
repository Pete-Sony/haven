create or replace function public.save_haven_onboarding(
  p_profile_ciphertext text,
  p_profile_iv text,
  p_profile_auth_tag text,
  p_profile_key_version smallint,
  p_contact_ciphertext text,
  p_contact_iv text,
  p_contact_auth_tag text,
  p_contact_key_version smallint
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  contact_id uuid;
begin
  if current_user_id is null then
    raise exception 'unauthorized';
  end if;
  if p_profile_key_version < 1 or p_contact_key_version < 1 then
    raise exception 'invalid_key_version';
  end if;

  insert into public.support_profiles (
    user_id, ciphertext, iv, auth_tag, key_version, updated_at
  )
  values (
    current_user_id, p_profile_ciphertext, p_profile_iv,
    p_profile_auth_tag, p_profile_key_version, now()
  )
  on conflict (user_id) do update set
    ciphertext = excluded.ciphertext,
    iv = excluded.iv,
    auth_tag = excluded.auth_tag,
    key_version = excluded.key_version,
    updated_at = now();

  insert into public.trusted_contacts (
    user_id, ciphertext, iv, auth_tag, key_version, updated_at
  )
  values (
    current_user_id, p_contact_ciphertext, p_contact_iv,
    p_contact_auth_tag, p_contact_key_version, now()
  )
  on conflict (user_id) do update set
    ciphertext = excluded.ciphertext,
    iv = excluded.iv,
    auth_tag = excluded.auth_tag,
    key_version = excluded.key_version,
    updated_at = now()
  returning id into contact_id;

  return contact_id;
end;
$$;

revoke all on function public.save_haven_onboarding(
  text, text, text, smallint, text, text, text, smallint
) from public, anon;
grant execute on function public.save_haven_onboarding(
  text, text, text, smallint, text, text, text, smallint
) to authenticated;

create table if not exists public.habit_trackers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  key_version smallint not null default 1 check (key_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.habit_trackers enable row level security;

create policy "users_manage_own_habit_tracker"
on public.habit_trackers for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.habit_trackers from anon;
grant select, insert, update, delete on table public.habit_trackers
to authenticated;

create table if not exists public.habit_checkins (
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  key_version smallint not null default 1 check (key_version > 0),
  expires_at timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, local_date),
  check (expires_at > created_at)
);

alter table public.habit_checkins enable row level security;

create policy "users_manage_own_habit_checkins"
on public.habit_checkins for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists habit_checkins_expiry_idx
on public.habit_checkins (expires_at);

revoke all on table public.habit_checkins from anon;
grant select, insert, update, delete on table public.habit_checkins
to authenticated;

select cron.schedule(
  'haven-purge-expired-habit-checkins',
  '41 3 * * *',
  $$delete from public.habit_checkins where expires_at <= now()$$
)
where not exists (
  select 1 from cron.job where jobname = 'haven-purge-expired-habit-checkins'
);
