-- Security release 2, phase A (additive; safe with the app code already live).
--
-- squares and contests are readable by anyone (the public grid and contest
-- page need them, and realtime streams squares). Participant email/Venmo and
-- the access PIN move to owner-only tables. Phase B (a later migration) drops
-- the old columns and the anonymous claim policy once the app uses these.

-- ---------------------------------------------------------------------------
-- Participant contact details: owner-only
-- ---------------------------------------------------------------------------
create table if not exists public.square_claimants (
  square_id uuid primary key references public.squares (id) on delete cascade,
  contest_id uuid not null references public.contests (id) on delete cascade,
  email text not null,
  venmo text,
  created_at timestamptz not null default now()
);

create index if not exists square_claimants_contest_email_idx
  on public.square_claimants (contest_id, lower(email));

alter table public.square_claimants enable row level security;

create policy "Contest owners can manage claimants"
  on public.square_claimants
  for all
  to authenticated
  using (exists (
    select 1 from public.contests c
    where c.id = square_claimants.contest_id and c.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.contests c
    where c.id = square_claimants.contest_id and c.owner_id = (select auth.uid())
  ));

insert into public.square_claimants (square_id, contest_id, email, venmo)
select id, contest_id, claimant_email, claimant_venmo
from public.squares
where claimant_email is not null
on conflict (square_id) do nothing;

-- Transition only (dropped in phase B): keep square_claimants in step while
-- the old app code still writes squares.claimant_email / claimant_venmo.
create or replace function public.sync_square_claimant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.claimant_email is null then
    delete from public.square_claimants where square_id = new.id;
  else
    insert into public.square_claimants (square_id, contest_id, email, venmo)
    values (new.id, new.contest_id, new.claimant_email, new.claimant_venmo)
    on conflict (square_id) do update
      set email = excluded.email, venmo = excluded.venmo;
  end if;
  return new;
end;
$$;

create trigger squares_sync_claimant
  after update of claimant_email, claimant_venmo on public.squares
  for each row
  when (old.claimant_email is distinct from new.claimant_email
        or old.claimant_venmo is distinct from new.claimant_venmo)
  execute function public.sync_square_claimant();

-- ---------------------------------------------------------------------------
-- Access PINs: owner-only (the server reads them with the service role)
-- ---------------------------------------------------------------------------
create table if not exists public.contest_pins (
  contest_id uuid primary key references public.contests (id) on delete cascade,
  pin varchar(6) not null,
  updated_at timestamptz not null default now()
);

alter table public.contest_pins enable row level security;

create policy "Contest owners can manage pins"
  on public.contest_pins
  for all
  to authenticated
  using (exists (
    select 1 from public.contests c
    where c.id = contest_pins.contest_id and c.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.contests c
    where c.id = contest_pins.contest_id and c.owner_id = (select auth.uid())
  ));

insert into public.contest_pins (contest_id, pin)
select id, access_pin
from public.contests
where access_pin is not null and access_pin <> ''
on conflict (contest_id) do nothing;

-- Transition only (dropped in phase B).
create or replace function public.sync_contest_pin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.access_pin is null or new.access_pin = '' then
    delete from public.contest_pins where contest_id = new.id;
  else
    insert into public.contest_pins (contest_id, pin)
    values (new.id, new.access_pin)
    on conflict (contest_id) do update
      set pin = excluded.pin, updated_at = now();
  end if;
  return new;
end;
$$;

create trigger contests_sync_pin
  after insert or update of access_pin on public.contests
  for each row
  execute function public.sync_contest_pin();

-- ---------------------------------------------------------------------------
-- Claiming a square: one atomic, server-only function
-- ---------------------------------------------------------------------------
-- Checks the contest is open and the per-person limit, claims the square only
-- if it is still available, and stores the contact details. Only the service
-- role may call it; the app's claim action validates input and rate-limits
-- first.
create or replace function public.claim_square(
  p_contest_id uuid,
  p_square_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_venmo text,
  p_referred_by text
)
returns table (id uuid, row_index integer, col_index integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_status public.contest_status;
  v_max integer;
  v_count integer;
  v_square public.squares%rowtype;
begin
  select c.status, c.max_squares_per_person
    into v_status, v_max
  from public.contests c
  where c.id = p_contest_id and c.deleted_at is null;

  if not found then
    raise exception 'contest_not_found';
  end if;

  if v_status <> 'open' then
    raise exception 'contest_not_open';
  end if;

  if v_max is not null then
    -- One claimer at a time per contest + email, so two quick claims can't
    -- both slip under the limit.
    perform pg_advisory_xact_lock(hashtext(p_contest_id::text || ':' || lower(p_email)));

    select count(*) into v_count
    from public.square_claimants sc
    join public.squares s on s.id = sc.square_id
    where sc.contest_id = p_contest_id
      and lower(sc.email) = lower(p_email)
      and s.payment_status <> 'available';

    if v_count >= v_max then
      raise exception 'max_squares_reached';
    end if;
  end if;

  update public.squares s
  set claimant_first_name = p_first_name,
      claimant_last_name = p_last_name,
      payment_status = 'pending',
      claimed_at = now(),
      paid_at = null,
      referred_by = p_referred_by
  where s.id = p_square_id
    and s.contest_id = p_contest_id
    and s.payment_status = 'available'
  returning s.* into v_square;

  if not found then
    raise exception 'square_taken';
  end if;

  insert into public.square_claimants (square_id, contest_id, email, venmo)
  values (p_square_id, p_contest_id, p_email, p_venmo)
  on conflict (square_id) do update
    set email = excluded.email, venmo = excluded.venmo, created_at = now();

  return query select v_square.id, v_square.row_index, v_square.col_index;
end;
$$;

revoke all on function public.claim_square(uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_square(uuid, uuid, text, text, text, text, text) to service_role;
