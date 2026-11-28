-- Stripe Connect, PR 1: card payments for hit-a-thon pledges. Additive, safe
-- with the app code already live (nothing reads these tables yet, and the lock
-- keeps its old behavior unless the app says the team can take cards).
-- Plan: brain stripe-connect-plan.md.
--
-- Each team (contest owner) gets its own Stripe account, created through
-- Fundwell. Supporters pay that account directly; Fundwell never holds the
-- money. None of these tables depend on the fundraiser type, so squares can
-- use them later.

-- ---------------------------------------------------------------------------
-- stripe_accounts: one Stripe account per owner per mode (live, or sandbox for
-- tests). Owners read their own row; only the service role writes, so a user
-- can't point their fundraisers at someone else's account.
-- ---------------------------------------------------------------------------
create table public.stripe_accounts (
  user_id uuid not null references auth.users (id) on delete cascade,
  livemode boolean not null,
  stripe_account_id text not null unique,
  -- The card_payments capability as Stripe last reported it; null until
  -- Stripe reports one. Only 'active' can take payments.
  card_payments_status text
    check (card_payments_status in ('active', 'pending', 'restricted', 'unsupported')),
  -- Set when the team disconnects or Stripe closes the account.
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, livemode)
);

create trigger stripe_accounts_updated_at
  before update on public.stripe_accounts
  for each row execute function public.update_updated_at();

alter table public.stripe_accounts enable row level security;

revoke all on public.stripe_accounts from anon, authenticated;
grant select on public.stripe_accounts to authenticated;
grant all on public.stripe_accounts to service_role;

create policy "Owners can view their own Stripe account"
  on public.stripe_accounts
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- stripe_events: Stripe events already handled. Stripe retries and can send
-- an event twice, so a webhook records the id and skips repeats. Service role
-- only.
-- ---------------------------------------------------------------------------
create table public.stripe_events (
  id text primary key,
  type text not null,
  livemode boolean not null,
  -- The connected account the event came from; null for the platform's own.
  stripe_account_id text,
  processed_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;

revoke all on public.stripe_events from anon, authenticated;
grant all on public.stripe_events to service_role;

-- ---------------------------------------------------------------------------
-- pledge_payments: a pledge's card payment. Kept off pledges, which anyone can
-- read for a readable contest. pay_token is the secret in the emailed pay link,
-- so owners can read every column but that one. Written only by the service
-- role (the pay page and the webhook).
-- ---------------------------------------------------------------------------
create table public.pledge_payments (
  pledge_id uuid primary key references public.pledges (id) on delete cascade,
  contest_id uuid not null references public.contests (id) on delete cascade,
  pay_token uuid not null unique default gen_random_uuid(),
  stripe_account_id text,
  -- The open Checkout, if any: one per pledge, reused or expired, never two.
  checkout_session_id text unique,
  checkout_expires_at timestamptz,
  payment_intent_id text unique,
  amount_paid numeric(10, 2) check (amount_paid > 0),
  card_paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The payment is in its pledge's contest.
  foreign key (contest_id, pledge_id) references public.pledges (contest_id, id) on delete cascade,
  constraint pledge_payments_paid_check check ((card_paid_at is null) = (amount_paid is null))
);

-- Contest lookups (the foreign key).
create index pledge_payments_contest_idx on public.pledge_payments (contest_id);

create trigger pledge_payments_updated_at
  before update on public.pledge_payments
  for each row execute function public.update_updated_at();

alter table public.pledge_payments enable row level security;

revoke all on public.pledge_payments from anon, authenticated;
grant select (
  pledge_id, contest_id, stripe_account_id, checkout_session_id, checkout_expires_at,
  payment_intent_id, amount_paid, card_paid_at, created_at, updated_at
) on public.pledge_payments to authenticated;
grant all on public.pledge_payments to service_role;

create policy "Contest owners can view pledge payments"
  on public.pledge_payments
  for select
  to authenticated
  using (exists (
    select 1 from public.contests c
    where c.id = pledge_payments.contest_id and c.owner_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- lock_hit_a_thon: a team that takes cards can lock with no payment app
-- listed. The app passes p_card_payments (it knows whether it runs live or in
-- the sandbox, and checks the owner's account for that mode). The old
-- one-argument call keeps today's rule. Body unchanged apart from that check.
-- ---------------------------------------------------------------------------
drop function public.lock_hit_a_thon(uuid);

create function public.lock_hit_a_thon(p_contest_id uuid, p_card_payments boolean default false)
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

  if not coalesce(p_card_payments, false)
    and not exists (select 1 from public.payment_options po where po.contest_id = p_contest_id) then
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

revoke all on function public.lock_hit_a_thon(uuid, boolean) from public, anon, authenticated;
grant execute on function public.lock_hit_a_thon(uuid, boolean) to service_role;
