-- Super Bowl contests close two weeks after the final, and a completed contest
-- can't join a season. Additive, safe with the code already live.

-- When the final was first entered. A correction doesn't move it.
alter table public.super_bowl_games add column final_at timestamptz;

create or replace function public.set_super_bowl_final_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.final_afc is not null and new.final_at is null then
    new.final_at := now();
  end if;

  return new;
end;
$$;

revoke execute on function public.set_super_bowl_final_at() from public, anon, authenticated;

create trigger set_super_bowl_final_at
  before insert or update on public.super_bowl_games
  for each row execute function public.set_super_bowl_final_at();

-- Contests made after the final belong to the next game, so they stay open.
create or replace function public.close_super_bowl_contests()
returns void
language sql
set search_path = ''
as $$
  update public.contests c
  set status = 'completed'
  from public.super_bowl_games g
  where g.season = c.super_bowl_season
    and g.final_at < now() - interval '14 days'
    and c.created_at < g.final_at
    and c.sport_type = 'football'
    and c.deleted_at is null
    and c.status <> 'completed';
$$;

revoke execute on function public.close_super_bowl_contests() from public, anon, authenticated;
grant execute on function public.close_super_bowl_contests() to service_role;

select cron.schedule('close-super-bowl-contests', '15 * * * *', 'select public.close_super_bowl_contests()');

-- Last season's contests are completed: joining would score them again.
create or replace function public.enforce_super_bowl_season()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
    and new.super_bowl_season is not null
    and old.status = 'completed'
  then
    raise exception 'super_bowl_season_locked';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_super_bowl_season() from public, anon, authenticated;

create trigger enforce_super_bowl_season
  before update of super_bowl_season on public.contests
  for each row when (old.super_bowl_season is distinct from new.super_bowl_season)
  execute function public.enforce_super_bowl_season();
