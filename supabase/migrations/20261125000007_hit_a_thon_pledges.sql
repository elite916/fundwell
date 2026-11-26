-- Hit-a-thon release 3: pledges from the public player page. Additive, safe
-- with the app code already live.
--
-- One atomic, server-only function, like claim_square: the app's pledge action
-- validates input, checks the PIN and rate-limits, then calls this with the
-- service role. Plan: brain hit-a-thon-plan.md; copy: redesign-copy/hit-a-thon.md.
--
-- Errors the app maps (raised by name):
--   contest_not_found       no such contest, or deleted
--   not_a_hit_a_thon        a squares contest
--   not_accepting_pledges   not open (draft, pledges closed, hits locked, ended)
--   player_not_found        the player isn't in this contest
--   invalid_amount          not $1 to $10,000
--   invalid_cap             a flat gift with a cap, or a cap below the amount
--                           per hit or above $10,000
create or replace function public.create_pledge(
  p_contest_id uuid,
  p_player_id uuid,
  p_kind public.pledge_kind,
  p_amount numeric,
  p_cap numeric,
  p_first_name text,
  p_last_name text,
  p_email text
)
returns table (id uuid, status public.pledge_status, amount_owed numeric)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_contest record;
  v_id uuid;
  v_status public.pledge_status;
  v_owed numeric;
begin
  -- Locks the contest row, so closing pledges or the release-4 lock can't slip
  -- in between this check and the insert.
  select c.kind, c.status, c.hits_locked_at into v_contest
  from public.contests c
  where c.id = p_contest_id and c.deleted_at is null
  for share;

  if not found then
    raise exception 'contest_not_found';
  end if;

  if v_contest.kind <> 'hit_a_thon'::public.contest_kind then
    raise exception 'not_a_hit_a_thon';
  end if;

  if v_contest.status <> 'open'::public.contest_status or v_contest.hits_locked_at is not null then
    raise exception 'not_accepting_pledges';
  end if;

  if not exists (
    select 1 from public.hit_players hp
    where hp.id = p_player_id and hp.contest_id = p_contest_id
  ) then
    raise exception 'player_not_found';
  end if;

  -- The table checks hold these too; checked here so the app gets a name.
  if p_amount is null or p_amount < 1 or p_amount > 10000 then
    raise exception 'invalid_amount';
  end if;

  if p_cap is not null
    and (p_kind = 'flat'::public.pledge_kind or p_cap < p_amount or p_cap > 10000)
  then
    raise exception 'invalid_cap';
  end if;

  -- enforce_pledge_rules sets status and amount_owed.
  insert into public.pledges as pl (contest_id, player_id, kind, amount, cap)
  values (p_contest_id, p_player_id, p_kind, p_amount, p_cap)
  returning pl.id, pl.status, pl.amount_owed into v_id, v_status, v_owed;

  insert into public.pledge_contacts (pledge_id, contest_id, first_name, last_name, email)
  values (v_id, p_contest_id, p_first_name, p_last_name, p_email);

  return query select v_id, v_status, v_owed;
end;
$$;

revoke all on function public.create_pledge(uuid, uuid, public.pledge_kind, numeric, numeric, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_pledge(uuid, uuid, public.pledge_kind, numeric, numeric, text, text, text)
  to service_role;
