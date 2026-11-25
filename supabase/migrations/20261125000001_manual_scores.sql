-- Manual Super Bowl scores, phase A: additive, safe with the code already live.

-- ---------------------------------------------------------------------------
-- super_bowl_games: one row per season. Service role only.
-- ---------------------------------------------------------------------------
create table public.super_bowl_games (
  season int primary key,
  afc_team text not null,
  nfc_team text not null,
  q1_afc int check (q1_afc >= 0),
  q1_nfc int check (q1_nfc >= 0),
  q2_afc int check (q2_afc >= 0),
  q2_nfc int check (q2_nfc >= 0),
  q3_afc int check (q3_afc >= 0),
  q3_nfc int check (q3_nfc >= 0),
  final_afc int check (final_afc >= 0),
  final_nfc int check (final_nfc >= 0),
  updated_at timestamptz not null default now()
);

alter table public.super_bowl_games enable row level security;
revoke all on public.super_bowl_games from anon, authenticated;
grant all on public.super_bowl_games to service_role;

create trigger super_bowl_games_updated_at
  before update on public.super_bowl_games
  for each row execute function public.update_updated_at();

-- ---------------------------------------------------------------------------
-- contests: the season replaces is_super_bowl. The row team is set by the
-- service role only, so a rename can't flip winners.
-- ---------------------------------------------------------------------------
alter table public.contests
  add column super_bowl_season int,
  add column super_bowl_row_team text check (super_bowl_row_team in ('afc', 'nfc'));

grant insert (super_bowl_season), update (super_bowl_season) on public.contests to authenticated;

-- ---------------------------------------------------------------------------
-- scores: who entered them, and how many times the winner has changed
-- ---------------------------------------------------------------------------
alter table public.scores
  add column source text check (source in ('fundwell', 'organizer')),
  add column winner_rev int not null default 1;

-- The revision is never taken from the caller, and signed-in callers can't pick
-- the source. Runs after enforce_score_rules (triggers fire in name order).
create or replace function public.track_score_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.winner_rev := 1;

    if current_user in ('anon', 'authenticated') then
      new.source := 'organizer';
    end if;

    return new;
  end if;

  new.winner_rev := old.winner_rev;
  if new.winning_square_id is distinct from old.winning_square_id then
    new.winner_rev := old.winner_rev + 1;
  end if;

  if current_user in ('anon', 'authenticated') then
    new.source := old.source;
    if new.home_score is distinct from old.home_score or new.away_score is distinct from old.away_score then
      new.source := 'organizer';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.track_score_entry() from public, anon, authenticated;

create trigger track_score_entry
  before insert or update on public.scores
  for each row execute function public.track_score_entry();

-- ---------------------------------------------------------------------------
-- email_logs: a queue, with each email sent once
-- ---------------------------------------------------------------------------
alter table public.email_logs
  add column dedupe_key text,
  add constraint email_logs_status_check
    check (status in ('queued', 'sending', 'sent', 'failed', 'skipped', 'unconfirmed'));

-- Rows without a key (claim and numbers emails) don't collide.
create unique index email_logs_contest_dedupe_key on public.email_logs (contest_id, dedupe_key);
