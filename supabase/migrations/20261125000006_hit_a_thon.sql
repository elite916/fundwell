-- Hit-a-thon release 1, phase A: additive, safe with the app code already live.
--
-- A second kind of fundraiser. Supporters pledge to one player, per hit or a
-- flat gift; after the event the organizer enters each player's hits and locks
-- them. Plan: brain hit-a-thon-plan.md; behavior: redesign-copy/hit-a-thon.md.
--
-- Every existing contest becomes kind 'squares' and keeps its rules exactly.
-- The app doesn't create hit-a-thons yet (release 2), and pledges are written
-- only by a service-role function (release 3).

-- ---------------------------------------------------------------------------
-- contests.kind: which game a contest is. Separate from sport_type, which is
-- the sport, not the game. Set on insert only.
-- ---------------------------------------------------------------------------
create type public.contest_kind as enum ('squares', 'hit_a_thon');

alter table public.contests
  add column kind public.contest_kind not null default 'squares',
  -- Hit-a-thon settings. Hits can't exceed pitches, so a supporter can see the
  -- most they could owe before pledging.
  add column pitches_per_player int check (pitches_per_player between 1 and 100),
  -- One optional goal per player; the team goal is this times the players.
  add column player_goal numeric(10, 2) check (player_goal >= 1),
  -- Set once, by the service-role "lock and send" function (release 4). No
  -- owner grant: locking sends the total emails, so it can't be a plain update.
  add column hits_locked_at timestamptz;

-- The squares columns are required for squares only.
alter table public.contests
  alter column square_price drop not null,
  alter column row_team_name drop not null,
  alter column col_team_name drop not null;

-- Existing rows are all squares with these set (the columns were NOT NULL).
alter table public.contests
  add constraint contests_squares_fields check (
    kind <> 'squares'
    or (
      square_price is not null and row_team_name is not null and col_team_name is not null
      and pitches_per_player is null and player_goal is null and hits_locked_at is null
    )
  ),
  -- A hit-a-thon reaches in_progress only through the lock (whoever sets the
  -- status). It never joins a Super Bowl season: sport_type defaults to
  -- 'football', so a season would pull it into the Super Bowl scoring and the
  -- close_super_bowl_contests job.
  add constraint contests_hit_a_thon_fields check (
    kind <> 'hit_a_thon'
    or (
      pitches_per_player is not null
      and super_bowl_season is null
      and (status not in ('in_progress', 'completed') or hits_locked_at is not null)
    )
  );

-- createContest and updateContest (release 2). See 20261124000008.
grant insert (kind, pitches_per_player, player_goal) on public.contests to authenticated;
grant update (pitches_per_player, player_goal) on public.contests to authenticated;

-- ---------------------------------------------------------------------------
-- New contests: only squares get the 100 squares. Still security invoker: the
-- owner's insert relies on the authenticated grant on squares.
-- ---------------------------------------------------------------------------
create or replace function public.initialize_squares()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind = 'hit_a_thon' then
    return new;
  end if;

  for r in 0..9 loop
    for c in 0..9 loop
      insert into public.squares (contest_id, row_index, col_index)
      values (new.id, r, c);
    end loop;
  end loop;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Status flow. Squares: unchanged (draft -> open -> locked -> (open |
-- in_progress) -> completed). Hit-a-thons use the same values:
--   draft -> open            open the hit-a-thon (needs a player)
--   open <-> locked          "Close Pledges" / "Reopen Pledges"
--   open | locked -> in_progress   only once hits are locked
--   in_progress -> completed
-- The service role (the release-4 lock function) isn't checked, as before.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_contest_status_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), 'service_role') = 'service_role' then
    return new;
  end if;

  if new.kind = 'hit_a_thon'::public.contest_kind then
    if new.status = 'open'::public.contest_status
      and not exists (select 1 from public.hit_players p where p.contest_id = new.id)
    then
      raise exception 'players_required';
    end if;

    if (old.status, new.status) in (
      ('draft'::public.contest_status, 'open'::public.contest_status),
      ('open'::public.contest_status, 'locked'::public.contest_status),
      ('locked'::public.contest_status, 'open'::public.contest_status),
      ('in_progress'::public.contest_status, 'completed'::public.contest_status)
    ) then
      return new;
    end if;

    -- Owners can't start the event by hand: hits_locked_at is set only by the
    -- lock, which also sends the totals.
    if new.status = 'in_progress'::public.contest_status
      and old.status in ('open'::public.contest_status, 'locked'::public.contest_status)
      and new.hits_locked_at is not null
    then
      return new;
    end if;

    raise exception 'invalid_status_transition'
      using detail = format('%s -> %s', old.status, new.status);
  end if;

  if (old.status, new.status) in (
    ('draft'::public.contest_status, 'open'::public.contest_status),
    ('open'::public.contest_status, 'locked'::public.contest_status),
    ('locked'::public.contest_status, 'open'::public.contest_status),
    ('locked'::public.contest_status, 'in_progress'::public.contest_status),
    ('in_progress'::public.contest_status, 'completed'::public.contest_status)
  ) then
    return new;
  end if;

  raise exception 'invalid_status_transition'
    using detail = format('%s -> %s', old.status, new.status);
end;
$$;

-- From 20261124000010, with one change: "no game without numbers" is for
-- squares only. A hit-a-thon has no grid.
create or replace function public.enforce_contest_update_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  digits constant integer[] := array[0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if new.row_numbers is distinct from old.row_numbers
    or new.col_numbers is distinct from old.col_numbers
    or new.numbers_auto_generated is distinct from old.numbers_auto_generated
  then
    if old.status in ('in_progress', 'completed') then
      raise exception 'numbers_locked';
    end if;

    if array_ndims(new.row_numbers) is distinct from 1
      or array_ndims(new.col_numbers) is distinct from 1
      or array_lower(new.row_numbers, 1) is distinct from 1
      or array_lower(new.col_numbers, 1) is distinct from 1
      or (select array_agg(n order by n) from unnest(new.row_numbers) as n) is distinct from digits
      or (select array_agg(n order by n) from unnest(new.col_numbers) as n) is distinct from digits
    then
      raise exception 'invalid_numbers';
    end if;
  end if;

  if old.status in ('in_progress', 'completed')
    and (
      new.square_price, new.max_squares_per_person, new.prize_type,
      new.payout_q1_percent, new.payout_q2_percent, new.payout_q3_percent, new.payout_final_percent,
      new.payout_game1_percent, new.payout_game2_percent, new.payout_game3_percent, new.payout_game4_percent,
      new.payout_game5_percent, new.payout_game6_percent, new.payout_game7_percent,
      new.prize_q1_text, new.prize_q2_text, new.prize_q3_text, new.prize_final_text
    ) is distinct from (
      old.square_price, old.max_squares_per_person, old.prize_type,
      old.payout_q1_percent, old.payout_q2_percent, old.payout_q3_percent, old.payout_final_percent,
      old.payout_game1_percent, old.payout_game2_percent, old.payout_game3_percent, old.payout_game4_percent,
      old.payout_game5_percent, old.payout_game6_percent, old.payout_game7_percent,
      old.prize_q1_text, old.prize_q2_text, old.prize_q3_text, old.prize_final_text
    )
  then
    raise exception 'contest_rules_locked';
  end if;

  if new.status is distinct from old.status then
    if new.status = 'in_progress' and new.kind = 'squares'
      and (new.row_numbers is null or new.col_numbers is null)
    then
      raise exception 'numbers_required';
    end if;

    if old.status = 'locked' and new.status = 'open'
      and exists (select 1 from public.scores s where s.contest_id = new.id)
    then
      raise exception 'scores_exist';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rules that hold for every caller, the service role included:
--   * kind is fixed: squares and hit-a-thons have different rows hanging off
--     them (squares vs players and pledges).
--   * pitches can't change once hits are locked (the totals have gone out),
--     and can't drop below a hit count already entered.
-- Security definer so it sees every player, whatever the caller can read.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_contest_kind_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind is distinct from old.kind then
    raise exception 'contest_kind_locked';
  end if;

  if new.pitches_per_player is distinct from old.pitches_per_player then
    if old.hits_locked_at is not null then
      raise exception 'pitches_locked';
    end if;

    if exists (
      select 1 from public.hit_players p
      where p.contest_id = new.id and p.hits > new.pitches_per_player
    ) then
      raise exception 'pitches_below_hits';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_contest_kind_rules() from public, anon, authenticated;

create trigger enforce_contest_kind_rules
  before update of kind, pitches_per_player on public.contests
  for each row execute function public.enforce_contest_kind_rules();

-- ---------------------------------------------------------------------------
-- scores are a squares thing. Refused for hit-a-thons from every caller; the
-- Super Bowl scoring already skips contests without grid numbers. Named to
-- run before enforce_score_rules (triggers fire in name order), so the error
-- says why.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_score_contest_kind()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.contests c
    where c.id = new.contest_id and c.kind = 'hit_a_thon'::public.contest_kind
  ) then
    raise exception 'scores_not_squares';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_score_contest_kind() from public, anon, authenticated;

create trigger enforce_score_contest_kind
  before insert or update on public.scores
  for each row execute function public.enforce_score_contest_kind();

-- ---------------------------------------------------------------------------
-- hit_players: its own table, so player names aren't on the public contests
-- row (contests.players is readable by anyone). Credit is by id, never by
-- name, so a rename keeps its pledges.
-- ---------------------------------------------------------------------------
create table public.hit_players (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests (id) on delete cascade,
  -- Players are minors: first names only.
  first_name text not null check (first_name = btrim(first_name) and char_length(first_name) between 1 and 40),
  -- Same as the squares player model (src/features/contests/types/player.ts):
  -- an optional positive whole number.
  number int check (number > 0),
  -- The player's page link; same format as the squares player model.
  slug text not null check (slug ~ '^[a-z0-9-]{1,100}$'),
  -- Null until entered after the event.
  hits int check (hits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Also the index for the contest_id foreign key.
  unique (contest_id, slug),
  -- Target of pledges' same-contest foreign key.
  unique (contest_id, id)
);

-- "Duplicate name": two Sams on one team need telling apart.
create unique index hit_players_contest_first_name_idx
  on public.hit_players (contest_id, lower(first_name));

create trigger hit_players_updated_at
  before update on public.hit_players
  for each row execute function public.update_updated_at();

-- For every caller: the contest is a hit-a-thon, hits fit the pitches, and
-- once hits are locked no count changes and no player is added (the totals
-- have been emailed). Locks the contest row so a pitches change or the lock
-- can't slip in between the check and the write.
create or replace function public.enforce_hit_player_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  contest record;
begin
  select c.kind, c.pitches_per_player, c.hits_locked_at into contest
  from public.contests c
  where c.id = new.contest_id
  for share;

  if not found or contest.kind <> 'hit_a_thon'::public.contest_kind then
    raise exception 'not_a_hit_a_thon';
  end if;

  if contest.hits_locked_at is not null
    and (tg_op = 'INSERT' or new.hits is distinct from old.hits or new.contest_id <> old.contest_id)
  then
    raise exception 'hits_locked';
  end if;

  if new.hits > contest.pitches_per_player then
    raise exception 'hits_over_pitches';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_hit_player_rules() from public, anon, authenticated;

create trigger enforce_hit_player_rules
  before insert or update on public.hit_players
  for each row execute function public.enforce_hit_player_rules();

alter table public.hit_players enable row level security;

-- Supabase grants new tables to anon and authenticated by default.
revoke all on public.hit_players from anon, authenticated;
grant select on public.hit_players to anon, authenticated;
-- contest_id on insert only: a player can't move to another contest.
grant insert (contest_id, first_name, number, slug, hits) on public.hit_players to authenticated;
grant update (first_name, number, slug, hits) on public.hit_players to authenticated;
grant delete on public.hit_players to authenticated;
grant all on public.hit_players to service_role;

-- Player pages are public, like the squares grid: readable when the contest
-- is (not draft, not PIN-protected, not deleted; always for the owner).
create policy "Anyone can view players of readable contests"
  on public.hit_players
  for select
  to anon, authenticated
  using (public.contest_is_readable(contest_id));

-- Same as "Contest owners can manage all squares".
create policy "Contest owners can manage players"
  on public.hit_players
  for all
  to authenticated
  using (exists (
    select 1 from public.contests c
    where c.id = hit_players.contest_id and c.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.contests c
    where c.id = hit_players.contest_id and c.owner_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- pledges: one supporter's pledge to one player. No names or emails here
-- (those are in pledge_contacts), so public pages can read it for totals and
-- supporter counts.
-- ---------------------------------------------------------------------------
create type public.pledge_kind as enum ('per_hit', 'flat');

-- pledged: per hit, before the lock (amount not known yet)
-- pending: amount known, unpaid      paid: the organizer marked it paid
-- nothing_owed: per hit, 0 hits      cancelled: by the organizer
create type public.pledge_status as enum ('pledged', 'pending', 'paid', 'nothing_owed', 'cancelled');

create table public.pledges (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests (id) on delete cascade,
  player_id uuid not null,
  kind public.pledge_kind not null,
  -- $1 to $10,000 stops typos like $500 a hit meant as $5.
  amount numeric(10, 2) not null check (amount between 1 and 10000),
  -- Per hit only: the most the supporter will pay, whatever the hits.
  cap numeric(10, 2) check (cap <= 10000),
  -- Worked out at the lock for per-hit pledges; the amount for flat gifts.
  amount_owed numeric(10, 2) check (amount_owed >= 0),
  status public.pledge_status not null,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  -- The player is in the pledge's contest. NO ACTION, not RESTRICT: both
  -- refuse removing a player who has pledges, but RESTRICT is checked before
  -- the end of the statement, so a contest delete (or a user delete, which
  -- cascades to contests) could fail depending on which cascade runs first.
  foreign key (contest_id, player_id) references public.hit_players (contest_id, id),
  -- Target of pledge_contacts' same-contest foreign key.
  unique (contest_id, id),
  constraint pledges_cap_rules check (
    case kind
      when 'flat' then cap is null
      else cap is null or cap >= amount
    end
  ),
  constraint pledges_paid_at_check check ((status = 'paid') = (paid_at is not null)),
  constraint pledges_cancelled_at_check check ((status = 'cancelled') = (cancelled_at is not null))
);

-- Contest lookups and the player foreign key (contest_id first).
create index pledges_contest_player_idx on public.pledges (contest_id, player_id);

-- Inserts (all callers): a flat gift is owed right away and can be paid
-- before the event; a per-hit pledge waits for the hits.
-- Updates by owners: mark paid or pending, or cancel. Nothing else. The
-- service role (release 4's lock) sets amount_owed and nothing_owed.
create or replace function public.enforce_pledge_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.kind = 'flat' then
      new.status := 'pending';
      new.amount_owed := new.amount;
    else
      new.status := 'pledged';
      new.amount_owed := null;
    end if;
    new.paid_at := null;
    new.cancelled_at := null;
    return new;
  end if;

  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if new.status = old.status then
    if new.paid_at is distinct from old.paid_at or new.cancelled_at is distinct from old.cancelled_at then
      raise exception 'invalid_pledge_status';
    end if;
  elsif old.status = 'pending' and new.status = 'paid' then
    new.paid_at := now();
  elsif old.status = 'paid' and new.status = 'pending' then
    new.paid_at := null;
  elsif old.status in ('pledged', 'pending') and new.status = 'cancelled' then
    new.cancelled_at := now();
  else
    raise exception 'invalid_pledge_status'
      using detail = format('%s -> %s', old.status, new.status);
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_pledge_rules() from public, anon, authenticated;

create trigger enforce_pledge_rules
  before insert or update on public.pledges
  for each row execute function public.enforce_pledge_rules();

alter table public.pledges enable row level security;

-- No client inserts or deletes: pledges come from a service-role function
-- (release 3), like claim_square.
revoke all on public.pledges from anon, authenticated;
grant select on public.pledges to anon, authenticated;
grant update (status, paid_at, cancelled_at) on public.pledges to authenticated;
grant all on public.pledges to service_role;

create policy "Anyone can view pledges of readable contests"
  on public.pledges
  for select
  to anon, authenticated
  using (public.contest_is_readable(contest_id));

create policy "Contest owners can update pledges"
  on public.pledges
  for update
  to authenticated
  using (exists (
    select 1 from public.contests c
    where c.id = pledges.contest_id and c.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.contests c
    where c.id = pledges.contest_id and c.owner_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- pledge_contacts: the supporter's name and email. Owner-only, written only
-- by the service role. Same shape as square_claimants.
-- ---------------------------------------------------------------------------
create table public.pledge_contacts (
  pledge_id uuid primary key references public.pledges (id) on delete cascade,
  contest_id uuid not null references public.contests (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  -- The contact is in its pledge's contest.
  foreign key (contest_id, pledge_id) references public.pledges (contest_id, id) on delete cascade
);

-- Contest lookups (the foreign key) and "this supporter's pledges".
create index pledge_contacts_contest_email_idx
  on public.pledge_contacts (contest_id, lower(email));

alter table public.pledge_contacts enable row level security;

revoke all on public.pledge_contacts from anon, authenticated;
grant select on public.pledge_contacts to authenticated;
grant all on public.pledge_contacts to service_role;

create policy "Contest owners can view pledge contacts"
  on public.pledge_contacts
  for select
  to authenticated
  using (exists (
    select 1 from public.contests c
    where c.id = pledge_contacts.contest_id and c.owner_id = (select auth.uid())
  ));
