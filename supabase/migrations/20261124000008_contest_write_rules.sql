-- Security release 5a (safe with the app code already live).
--
-- Enforces the app's own write rules in the database, so they hold for direct
-- API calls too:
--   * Column grants cover what the app never writes. They follow the role, so
--     the service role, migrations and SECURITY DEFINER functions
--     (soft_delete_contest, claim_square) keep full access.
--   * Triggers cover what depends on the contest's state. They check
--     current_user, not auth.role(): inside soft_delete_contest the JWT is
--     still the owner's, but current_user is the function's owner.
--
-- When an action starts writing a new column, add it to the grant here in a
-- new migration.

-- ---------------------------------------------------------------------------
-- contests: only the columns the app writes
-- ---------------------------------------------------------------------------
-- Also removes DELETE: the app only soft-deletes (soft_delete_contest).
revoke insert, update, delete on public.contests from anon, authenticated;

-- createContest
grant insert (
  owner_id, code, slug, name, description, sport_type, row_team_name, col_team_name,
  square_price, max_squares_per_person,
  payout_q1_percent, payout_q2_percent, payout_q3_percent, payout_final_percent,
  payout_game1_percent, payout_game2_percent, payout_game3_percent, payout_game4_percent,
  payout_game5_percent, payout_game6_percent, payout_game7_percent,
  hero_image_url, hero_image_position, org_image_url, primary_color, secondary_color,
  prize_type, prize_q1_text, prize_q2_text, prize_q3_text, prize_final_text, status
) on public.contests to authenticated;

-- updateContest, updateContestStatus and assignGridNumbers
grant update (
  is_public, name, description, row_team_name, col_team_name,
  square_price, max_squares_per_person, prize_type,
  payout_q1_percent, payout_q2_percent, payout_q3_percent, payout_final_percent,
  payout_game1_percent, payout_game2_percent, payout_game3_percent, payout_game4_percent,
  payout_game5_percent, payout_game6_percent, payout_game7_percent,
  prize_q1_text, prize_q2_text, prize_q3_text, prize_final_text,
  hero_image_url, hero_image_position, org_image_url, primary_color, secondary_color,
  is_super_bowl, enable_player_tracking, players,
  status,
  row_numbers, col_numbers, numbers_auto_generated
) on public.contests to authenticated;

-- New contests start as drafts.
alter policy "Users can create contests" on public.contests
  with check (auth.uid() = owner_id and status = 'draft');

-- assignGridNumbers: both sets, each the digits 0-9 once, until the game
-- starts. updateContestStatus: no game without numbers, no reopening a locked
-- contest that has scores.
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

  if new.status is distinct from old.status then
    if new.status = 'in_progress' and (new.row_numbers is null or new.col_numbers is null) then
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

revoke execute on function public.enforce_contest_update_rules() from public, anon, authenticated;

drop trigger if exists enforce_contest_update_rules on public.contests;
create trigger enforce_contest_update_rules
  before update on public.contests
  for each row execute function public.enforce_contest_update_rules();

-- ---------------------------------------------------------------------------
-- squares: owners change payment status and release; nothing else
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.squares from anon, authenticated;

-- initialize_squares runs as the owner when a contest is created
grant insert (contest_id, row_index, col_index) on public.squares to authenticated;

-- updateSquareStatus and bulkUpdateSquares
grant update (
  payment_status, paid_at, claimant_first_name, claimant_last_name, claimed_at, referred_by
) on public.squares to authenticated;

-- Releasing a square clears the claim. Nothing else may change it: claims are
-- made only by claim_square().
create or replace function public.enforce_square_update_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if new.payment_status = 'available' then
    if num_nonnulls(
      new.claimant_first_name, new.claimant_last_name, new.claimed_at, new.paid_at, new.referred_by
    ) > 0 then
      raise exception 'square_claim_locked';
    end if;
  elsif new.claimant_first_name is distinct from old.claimant_first_name
    or new.claimant_last_name is distinct from old.claimant_last_name
    or new.claimed_at is distinct from old.claimed_at
    or new.referred_by is distinct from old.referred_by
  then
    raise exception 'square_claim_locked';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_square_update_rules() from public, anon, authenticated;

drop trigger if exists enforce_square_update_rules on public.squares;
create trigger enforce_square_update_rules
  before update on public.squares
  for each row execute function public.enforce_square_update_rules();

-- ---------------------------------------------------------------------------
-- square_claimants: written only by claim_square(); owners read them, and
-- remove them when a square is released
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.square_claimants from anon, authenticated;
grant delete on public.square_claimants to authenticated;

-- A contact always belongs to its square's contest (0 rows expected).
update public.square_claimants sc
set contest_id = s.contest_id
from public.squares s
where s.id = sc.square_id and s.contest_id <> sc.contest_id;

drop policy if exists "Contest owners can manage claimants" on public.square_claimants;
drop policy if exists "Contest owners can view claimants" on public.square_claimants;
drop policy if exists "Contest owners can remove released claimants" on public.square_claimants;

create policy "Contest owners can view claimants"
  on public.square_claimants
  for select
  to authenticated
  using (exists (
    select 1 from public.contests c
    where c.id = square_claimants.contest_id and c.owner_id = (select auth.uid())
  ));

create policy "Contest owners can remove released claimants"
  on public.square_claimants
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.contests c
      where c.id = square_claimants.contest_id and c.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.squares s
      where s.id = square_claimants.square_id and s.payment_status = 'available'
    )
  );

-- ---------------------------------------------------------------------------
-- scores: saveScores' rules. Only during the game, and the winner is the
-- square at the numbers.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.scores from anon, authenticated;
grant insert, update on public.scores to authenticated;

create or replace function public.enforce_score_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  contest record;
  winner uuid;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'UPDATE' and (
    new.id <> old.id or new.contest_id <> old.contest_id or new.quarter <> old.quarter
  ) then
    raise exception 'score_identity_locked';
  end if;

  select c.status, c.row_numbers, c.col_numbers into contest
  from public.contests c
  where c.id = new.contest_id;

  if not found or contest.status <> 'in_progress' then
    raise exception 'scores_locked';
  end if;

  if contest.row_numbers is null or contest.col_numbers is null then
    raise exception 'numbers_required';
  end if;

  select s.id into winner
  from public.squares s
  where s.contest_id = new.contest_id
    and s.row_index = array_position(contest.row_numbers, new.home_score % 10) - 1
    and s.col_index = array_position(contest.col_numbers, new.away_score % 10) - 1;

  if new.winning_square_id is distinct from winner then
    raise exception 'winner_mismatch';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_score_rules() from public, anon, authenticated;

drop trigger if exists enforce_score_rules on public.scores;
create trigger enforce_score_rules
  before insert or update on public.scores
  for each row execute function public.enforce_score_rules();
