-- Release 4b (additive; safe with the app code already live).
--
-- A per-contest lock for the send-numbers-revealed-emails function, so two
-- fast calls (a double-click) can't both send. The function takes the lock
-- through the service role and deletes the row when it's done. A lock older
-- than 5 minutes is treated as left over from a crash and can be taken again.
-- No one else can read the table or call the function.

create table if not exists public.numbers_email_locks (
  contest_id uuid primary key references public.contests (id) on delete cascade,
  locked_at timestamptz not null default now()
);

alter table public.numbers_email_locks enable row level security;

revoke all on table public.numbers_email_locks from public, anon, authenticated;
grant select, insert, update, delete on table public.numbers_email_locks to service_role;

-- Returns true if the caller now holds the lock for p_contest_id, null if
-- someone else does.
create or replace function public.take_numbers_email_lock(p_contest_id uuid)
returns boolean
language sql
set search_path = ''
as $$
  insert into public.numbers_email_locks as l (contest_id)
  values (p_contest_id)
  on conflict (contest_id) do update set locked_at = now()
    where l.locked_at < now() - interval '5 minutes'
  returning true;
$$;

revoke all on function public.take_numbers_email_lock(uuid) from public, anon, authenticated;
grant execute on function public.take_numbers_email_lock(uuid) to service_role;
