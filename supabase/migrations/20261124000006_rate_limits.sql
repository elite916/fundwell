-- Security release 3c (additive; safe with the app code already live).
--
-- Fixed-window rate limits kept in the database, so every server instance
-- shares them. Used by the PIN check (verifyPin) through the service role.
-- No one else can read the table or call the functions.

create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

create index if not exists rate_limits_window_start_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;

revoke all on table public.rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.rate_limits to service_role;

-- Counts one hit for p_key in the current window and returns whether the
-- count is still within p_max. Windows are aligned to multiples of
-- p_window_seconds. Now and then it deletes windows older than a day.
create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_window_start timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_max;
end;
$$;

-- Takes back one hit for p_key in the current window (a successful attempt
-- that shouldn't count).
create or replace function public.rate_limit_undo_hit(p_key text, p_window_seconds integer)
returns void
language sql
set search_path = ''
as $$
  update public.rate_limits
  set count = count - 1
  where key = p_key
    and window_start = to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds)
    and count > 0;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.rate_limit_undo_hit(text, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
grant execute on function public.rate_limit_undo_hit(text, integer) to service_role;
