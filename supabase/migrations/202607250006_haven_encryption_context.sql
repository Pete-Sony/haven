-- Context version 1 preserves existing haven:v1 ciphertext. All application
-- writes after this migration set version 2 and bind AAD to entity/user/record.
alter table public.saved_plans
  add column if not exists context_version smallint not null default 1
  check (context_version in (1, 2));
alter table public.trusted_contacts
  add column if not exists context_version smallint not null default 1
  check (context_version in (1, 2));
alter table public.support_profiles
  add column if not exists context_version smallint not null default 1
  check (context_version in (1, 2));
alter table public.support_memories
  add column if not exists context_version smallint not null default 1
  check (context_version in (1, 2));
alter table public.habit_trackers
  add column if not exists context_version smallint not null default 1
  check (context_version in (1, 2));
alter table public.habit_checkins
  add column if not exists context_version smallint not null default 1
  check (context_version in (1, 2));

create or replace function public.save_haven_onboarding_v2(
  p_profile_ciphertext text,
  p_profile_iv text,
  p_profile_auth_tag text,
  p_profile_key_version smallint,
  p_profile_context_version smallint,
  p_contact_ciphertext text,
  p_contact_iv text,
  p_contact_auth_tag text,
  p_contact_key_version smallint,
  p_contact_context_version smallint
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
  if p_profile_key_version < 1 or p_contact_key_version < 1
    or p_profile_context_version <> 2 or p_contact_context_version <> 2 then
    raise exception 'invalid_encryption_version';
  end if;

  insert into public.support_profiles (
    user_id, ciphertext, iv, auth_tag, key_version, context_version, updated_at
  )
  values (
    current_user_id, p_profile_ciphertext, p_profile_iv,
    p_profile_auth_tag, p_profile_key_version, p_profile_context_version, now()
  )
  on conflict (user_id) do update set
    ciphertext = excluded.ciphertext,
    iv = excluded.iv,
    auth_tag = excluded.auth_tag,
    key_version = excluded.key_version,
    context_version = excluded.context_version,
    updated_at = now();

  insert into public.trusted_contacts (
    user_id, ciphertext, iv, auth_tag, key_version, context_version, updated_at
  )
  values (
    current_user_id, p_contact_ciphertext, p_contact_iv,
    p_contact_auth_tag, p_contact_key_version, p_contact_context_version, now()
  )
  on conflict (user_id) do update set
    ciphertext = excluded.ciphertext,
    iv = excluded.iv,
    auth_tag = excluded.auth_tag,
    key_version = excluded.key_version,
    context_version = excluded.context_version,
    updated_at = now()
  returning id into contact_id;

  return contact_id;
end;
$$;

revoke all on function public.save_haven_onboarding_v2(
  text, text, text, smallint, smallint,
  text, text, text, smallint, smallint
) from public, anon;
grant execute on function public.save_haven_onboarding_v2(
  text, text, text, smallint, smallint,
  text, text, text, smallint, smallint
) to authenticated;

create or replace function public.delete_haven_onboarding()
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'unauthorized';
  end if;

  delete from public.trusted_contacts where user_id = current_user_id;
  delete from public.support_profiles where user_id = current_user_id;
end;
$$;

revoke all on function public.delete_haven_onboarding()
from public, anon;
grant execute on function public.delete_haven_onboarding()
to authenticated;
