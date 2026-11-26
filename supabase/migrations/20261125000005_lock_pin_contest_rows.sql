-- N1 (checklist 1.2): squares, scores and payment_options were readable by
-- anyone ("Anyone can view ..." using true), including rows of PIN-protected,
-- draft and deleted contests. Now a row is readable only when its contest is.
--
-- Deploy order: the contest page and claim action must already read these
-- tables with the service role after the PIN check (branch
-- security/n1-pin-lock). Apply this only once that code is live.
--
-- The contests policies don't change: a PIN contest's own row stays readable
-- (Brent, 2026-11-25). Owners keep their "manage" policies (ALL), so they still
-- see every row of their own contests, deleted ones included.

-- ---------------------------------------------------------------------------
-- contest_is_readable: true when the caller may read a contest's squares,
-- scores and payment options. Security definer so it can see contest_pins,
-- which is owner-only.
--
-- Called once per row by the policies below; Postgres can't inline a security
-- definer function. Each call is a primary-key lookup on contests and on
-- contest_pins, so a 100-square grid costs 200 index lookups. Fine at today's
-- sizes (about 1,700 squares, 17 contests).
-- ---------------------------------------------------------------------------
create or replace function public.contest_is_readable(p_contest_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.contests c
    where c.id = p_contest_id
      and c.deleted_at is null
      and (
        c.owner_id = (select auth.uid())
        or (
          c.is_public
          and c.status <> 'draft'::public.contest_status
          and not exists (select 1 from public.contest_pins p where p.contest_id = c.id)
        )
      )
  );
$$;

revoke execute on function public.contest_is_readable(uuid) from public;
grant execute on function public.contest_is_readable(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Replace the open SELECT policies. Realtime (squares, scores) applies the
-- same policies, so PIN, draft and deleted contests stop broadcasting to
-- anyone but their owner.
-- ---------------------------------------------------------------------------
drop policy "Anyone can view squares" on public.squares;
create policy "Anyone can view squares of readable contests" on public.squares
  for select to anon, authenticated
  using (public.contest_is_readable(contest_id));

drop policy "Anyone can view scores" on public.scores;
create policy "Anyone can view scores of readable contests" on public.scores
  for select to anon, authenticated
  using (public.contest_is_readable(contest_id));

drop policy "Anyone can view payment options" on public.payment_options;
create policy "Anyone can view payment options of readable contests" on public.payment_options
  for select to anon, authenticated
  using (public.contest_is_readable(contest_id));
