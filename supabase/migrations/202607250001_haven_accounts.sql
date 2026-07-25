create table if not exists public.saved_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  key_version smallint not null default 1 check (key_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saved_plans enable row level security;

create policy "users_select_own_plan"
on public.saved_plans for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users_insert_own_plan"
on public.saved_plans for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users_update_own_plan"
on public.saved_plans for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users_delete_own_plan"
on public.saved_plans for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists saved_plans_updated_at_idx
on public.saved_plans (updated_at desc);

revoke all on table public.saved_plans from anon;
grant select, insert, update, delete on table public.saved_plans to authenticated;

create table if not exists public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  key_version smallint not null default 1 check (key_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trusted_contacts enable row level security;

create policy "users_select_own_contact"
on public.trusted_contacts for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users_insert_own_contact"
on public.trusted_contacts for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users_update_own_contact"
on public.trusted_contacts for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users_delete_own_contact"
on public.trusted_contacts for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.trusted_contacts from anon;
grant select, insert, update, delete on table public.trusted_contacts to authenticated;
