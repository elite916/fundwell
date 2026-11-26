-- Hit-a-thon release 5: "Lock and Send Totals". Additive, safe with the app
-- code already live (nothing calls it until the release-5 app code ships).
--
-- One atomic, server-only function, like create_pledge: the app's lock action
-- checks ownership, calls this with the service role, then queues the emails.
-- Plan: brain hit-a-thon-plan.md; copy: redesign-copy/hit-a-thon.md.
--
-- Every trigger that would refuse these writes skips this function: the status
-- and limit triggers skip the service role (auth.role()), and the pledge and
-- update-rules triggers skip anyone but anon and authenticated (current_user is
-- the owner here). So the rules below are checked here. hits_locked_at and the
-- status are set in one update, as contests_hit_a_thon_fields requires. No new
-- table constraint.
--
-- Errors the app maps (raised by name):
--   contest_not_found         no such contest, or deleted
--   not_a_hit_a_thon          a squares contest
--   already_locked            hits are already locked (also in progress, completed)
--   invalid_status            not open or pledges closed (a draft)
--   players_required          no players
--   hits_missing              a player has no hit count (detail: how many)
--   payment_option_required   no payment option, so supporters can't pay
--
-- Writes, in one transaction:
--   per-hit pledges still 'pledged': amount_owed = least(amount x hits, cap);
--     0 hits -> 'nothing_owed' (owed 0), otherwise 'pending'
--   flat gifts, paid and cancelled pledges: unchanged
--   the contest: hits_locked_at = now(), status 'in_progress'
--
-- Returns what the app emails:
--   per_hit_owed    per-hit pledges now pending (total email)
--   per_hit_zero    per-hit pledges with nothing owed (zero-hits email)
--   flat_pending    flat gifts still unpaid (total email; paid ones get none)
--   total_owed      everything pending after the lock, as the dashboard's "Owed"
--   hits_locked_at  when the hits were locked
create or replace function public.lock_hit_a_thon(p_contest_id uuid)
returns table (
  per_hit_owed int,
  per_hit_zero int,
  flat_pending int,
  total_owed numeric,
  hits_locked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_contest record;
  v_missing int;
  v_locked_at timestamptz := now();
  v_owed int;
  v_zero int;
  v_flat int;
  v_total numeric;
begin
  -- Locks the contest row: create_pledge and hit count changes take a share
  -- lock on it, so neither can slip in between these checks and the writes.
  select c.kind, c.status, c.hits_locked_at into v_contest
  from public.contests c
  where c.id = p_contest_id and c.deleted_at is null
  for update;

  if not found then
    raise exception 'contest_not_found';
  end if;

  if v_contest.kind <> 'hit_a_thon'::public.contest_kind then
    raise exception 'not_a_hit_a_thon';
  end if;

  if v_contest.hits_locked_at is not null then
    raise exception 'already_locked';
  end if;

  if v_contest.status not in ('open'::public.contest_status, 'locked'::public.contest_status) then
    raise exception 'invalid_status'
      using detail = v_contest.status::text;
  end if;

  if not exists (select 1 from public.hit_players hp where hp.contest_id = p_contest_id) then
    raise exception 'players_required';
  end if;

  select count(*) into v_missing
  from public.hit_players hp
  where hp.contest_id = p_contest_id and hp.hits is null;

  if v_missing > 0 then
    raise exception 'hits_missing'
      using detail = v_missing::text;
  end if;

  if not exists (select 1 from public.payment_options po where po.contest_id = p_contest_id) then
    raise exception 'payment_option_required';
  end if;

  with priced as (
    update public.pledges as pl
    set
      amount_owed = least(pl.amount * hp.hits, pl.cap),
      status = case
        when hp.hits = 0 then 'nothing_owed'::public.pledge_status
        else 'pending'::public.pledge_status
      end
    from public.hit_players hp
    where pl.contest_id = p_contest_id
      and pl.kind = 'per_hit'::public.pledge_kind
      and pl.status = 'pledged'::public.pledge_status
      and hp.contest_id = pl.contest_id
      and hp.id = pl.player_id
    returning pl.status
  )
  select
    count(*) filter (where priced.status = 'pending'::public.pledge_status),
    count(*) filter (where priced.status = 'nothing_owed'::public.pledge_status)
  into v_owed, v_zero
  from priced;

  update public.contests as c
  set hits_locked_at = v_locked_at,
      status = 'in_progress'::public.contest_status
  where c.id = p_contest_id;

  select
    count(*) filter (where pl.kind = 'flat'::public.pledge_kind),
    coalesce(sum(pl.amount_owed), 0)
  into v_flat, v_total
  from public.pledges pl
  where pl.contest_id = p_contest_id
    and pl.status = 'pending'::public.pledge_status;

  return query select v_owed, v_zero, v_flat, v_total, v_locked_at;
end;
$$;

revoke all on function public.lock_hit_a_thon(uuid) from public, anon, authenticated;
grant execute on function public.lock_hit_a_thon(uuid) to service_role;
