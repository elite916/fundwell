-- Security release 5c (safe with the app code already live).
--
-- Once a contest is in progress or completed, its owner can't change the price,
-- payouts, prizes or max squares, can't release a claimed square, and can mark
-- only claimed squares paid or pending. Extends the trigger functions from
-- 20261124000008. The service role, migrations and SECURITY DEFINER functions
-- keep full access.

-- New: contest_rules_locked. Keep the columns in step with
-- LOCKED_AFTER_START in update-contest.ts.
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

-- New: square_release_locked and square_not_claimed. Claimed = not 'available'.
create or replace function public.enforce_square_update_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  contest_status public.contest_status;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if new.payment_status is distinct from old.payment_status then
    select c.status into contest_status
    from public.contests c
    where c.id = old.contest_id;

    if contest_status in ('in_progress', 'completed') then
      if new.payment_status = 'available' then
        raise exception 'square_release_locked';
      elsif old.payment_status = 'available' then
        raise exception 'square_not_claimed';
      end if;
    end if;
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
