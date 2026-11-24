-- Security release 3b: enforce the free plan's contest limit and the contest
-- status flow in the database, so they hold for direct PostgREST calls too.
--
-- Requests made with the service role (edge functions, admin client) and direct
-- database connections (no JWT claims: migrations, SQL editor) are not checked.
-- Only signed-in users ('authenticated') and 'anon' requests are.

-- ---------------------------------------------------------------------------
-- Pro = an active or trialing subscription on a paid price (unit_amount > 0).
-- The $0 Free price never counts. Matches hasActiveSubscription in the app.
-- ---------------------------------------------------------------------------
create or replace function public.owner_has_pro(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    join public.prices p on p.id = s.price_id
    where s.user_id = uid
      and s.status in ('active'::public.subscription_status, 'trialing'::public.subscription_status)
      and p.unit_amount > 0
  );
$$;

-- Only the triggers below (which run as the function owner) and the service
-- role need it. Granting it to authenticated would let anyone look up any
-- user's plan through /rpc/owner_has_pro.
revoke execute on function public.owner_has_pro(uuid) from public, anon, authenticated;
grant execute on function public.owner_has_pro(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Free plan: 1 active contest (draft, open, locked, in_progress; not deleted).
-- Checked only when a row becomes active, so owners already over the limit
-- can keep working on the contests they have.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_contest_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_statuses public.contest_status[] := array[
    'draft', 'open', 'locked', 'in_progress'
  ]::public.contest_status[];
  active_count integer;
begin
  if coalesce(auth.role(), 'service_role') = 'service_role' then
    return new;
  end if;

  -- Only when the row becomes active
  if not (new.status = any (active_statuses) and new.deleted_at is null) then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = any (active_statuses) and old.deleted_at is null then
    return new;
  end if;

  -- Serialize per owner so parallel inserts can't both pass the count
  perform pg_advisory_xact_lock(hashtextextended('contest_limit:' || new.owner_id::text, 0));

  if public.owner_has_pro(new.owner_id) then
    return new;
  end if;

  select count(*) into active_count
  from public.contests c
  where c.owner_id = new.owner_id
    and c.id <> new.id
    and c.deleted_at is null
    and c.status = any (active_statuses);

  if active_count >= 1 then
    raise exception 'contest_limit_reached'
      using hint = 'Free accounts can have 1 active contest. Upgrade to Pro for more.';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_contest_limit() from public, anon, authenticated;

drop trigger if exists enforce_contest_limit on public.contests;
create trigger enforce_contest_limit
  before insert or update of status, deleted_at on public.contests
  for each row execute function public.enforce_contest_limit();

-- ---------------------------------------------------------------------------
-- Status flow: draft -> open -> locked -> (open | in_progress) -> completed.
-- Same map as CONTEST_STATUS_TRANSITIONS in the app.
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

revoke execute on function public.enforce_contest_status_transition() from public, anon, authenticated;

drop trigger if exists enforce_contest_status_transition on public.contests;
create trigger enforce_contest_status_transition
  before update of status on public.contests
  for each row
  when (old.status is distinct from new.status)
  execute function public.enforce_contest_status_transition();
