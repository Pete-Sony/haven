create table if not exists public.request_budgets (
  identity_hash text not null check (identity_hash ~ '^[a-f0-9]{64}$'),
  budget_kind text not null check (budget_kind in ('ten_minute', 'daily')),
  used smallint not null check (used >= 0),
  window_started_at timestamptz not null,
  primary key (identity_hash, budget_kind)
);

alter table public.request_budgets enable row level security;
revoke all on table public.request_budgets from anon, authenticated;

create or replace function public.consume_haven_budget(
  p_identity_hash text,
  p_budget_kind text,
  p_cost smallint,
  p_limit smallint,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_used integer;
  current_started_at timestamptz;
begin
  if p_identity_hash !~ '^[a-f0-9]{64}$'
    or p_budget_kind not in ('ten_minute', 'daily')
    or p_cost < 1
    or p_limit < 1
    or p_cost > p_limit
    or p_window_seconds < 60
    or p_window_seconds > 86400
  then
    raise exception 'invalid_budget_input';
  end if;

  insert into public.request_budgets (
    identity_hash,
    budget_kind,
    used,
    window_started_at
  )
  values (p_identity_hash, p_budget_kind, p_cost, now())
  on conflict (identity_hash, budget_kind) do update
  set
    used = case
      when public.request_budgets.window_started_at
        <= now() - make_interval(secs => p_window_seconds)
      then p_cost
      else public.request_budgets.used + p_cost
    end,
    window_started_at = case
      when public.request_budgets.window_started_at
        <= now() - make_interval(secs => p_window_seconds)
      then now()
      else public.request_budgets.window_started_at
    end
  where
    public.request_budgets.window_started_at
      <= now() - make_interval(secs => p_window_seconds)
    or public.request_budgets.used + p_cost <= p_limit
  returning used, window_started_at
  into current_used, current_started_at;

  if found then
    return query select
      true,
      greatest(0, p_limit - current_used),
      0;
    return;
  end if;

  select used, window_started_at
  into current_used, current_started_at
  from public.request_budgets
  where identity_hash = p_identity_hash
    and budget_kind = p_budget_kind;

  return query select
    false,
    greatest(0, p_limit - current_used),
    greatest(
      1,
      ceil(
        extract(
          epoch from (
            current_started_at
            + make_interval(secs => p_window_seconds)
            - now()
          )
        )
      )::integer
    );
end;
$$;

revoke all on function public.consume_haven_budget(
  text,
  text,
  smallint,
  smallint,
  integer
) from public;
grant execute on function public.consume_haven_budget(
  text,
  text,
  smallint,
  smallint,
  integer
) to anon, authenticated;

create index if not exists request_budgets_window_started_at_idx
on public.request_budgets (window_started_at);
