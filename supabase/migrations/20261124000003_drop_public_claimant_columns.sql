-- Security release 2, phase B. Apply only after the app code that reads
-- square_claimants / contest_pins and claims through claim_square() is live.
--
-- Removes participant email/Venmo and the access PIN from the publicly
-- readable squares and contests rows (and so from realtime), and the policy
-- that let anyone claim a square directly through the API.

drop policy if exists "Anyone can claim available squares" on public.squares;

drop trigger if exists squares_sync_claimant on public.squares;
drop function if exists public.sync_square_claimant();
drop trigger if exists contests_sync_pin on public.contests;
drop function if exists public.sync_contest_pin();

alter table public.squares drop column if exists claimant_email;
alter table public.squares drop column if exists claimant_venmo;
alter table public.contests drop column if exists access_pin;
