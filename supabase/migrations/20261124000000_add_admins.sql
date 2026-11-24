-- Fundwell admins (the Super Bowl admin page and, later, Super Bowl score entry).
-- RLS is on with no policies, so only the service role can read or write it.
-- Add an admin with:
--   insert into public.admins (user_id) values ('<auth.users id>');

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
