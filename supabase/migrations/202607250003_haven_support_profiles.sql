create table if not exists public.support_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  key_version smallint not null default 1 check (key_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_profiles enable row level security;

create policy "users_select_own_support_profile"
on public.support_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users_insert_own_support_profile"
on public.support_profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users_update_own_support_profile"
on public.support_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users_delete_own_support_profile"
on public.support_profiles for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.support_profiles from anon;
grant select, insert, update, delete on table public.support_profiles
to authenticated;
