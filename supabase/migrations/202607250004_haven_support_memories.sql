create table if not exists public.support_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  key_version smallint not null default 1 check (key_version > 0),
  consent_version text not null check (consent_version = '1.0'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

alter table public.support_memories enable row level security;

create policy "users_select_own_support_memories"
on public.support_memories for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users_insert_own_support_memories"
on public.support_memories for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users_delete_own_support_memories"
on public.support_memories for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists support_memories_user_created_idx
on public.support_memories (user_id, created_at desc);

create index if not exists support_memories_expiry_idx
on public.support_memories (expires_at);

create or replace function public.enforce_haven_support_memory_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(
    hashtextextended(new.user_id::text, 0)
  );
  if (
    select count(*)
    from public.support_memories
    where user_id = new.user_id
      and expires_at > now()
  ) >= 20 then
    raise exception 'support_memory_limit_reached';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_haven_support_memory_limit
on public.support_memories;

create trigger enforce_haven_support_memory_limit
before insert on public.support_memories
for each row execute function public.enforce_haven_support_memory_limit();

revoke all on function public.enforce_haven_support_memory_limit()
from public, anon, authenticated;

revoke all on table public.support_memories from anon;
grant select, insert, delete on table public.support_memories to authenticated;

create extension if not exists pg_cron;

select cron.schedule(
  'haven-purge-expired-support-memories',
  '17 3 * * *',
  $$delete from public.support_memories where expires_at <= now()$$
);
