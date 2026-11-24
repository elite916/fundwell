-- Super Bowl tables are admin-only. The admin page reads them with the service
-- role, so no client role needs SELECT. Before this, anyone (even anonymous)
-- could read winner emails and Venmo handles in super_bowl_quarter_results.
-- Apply only after the app code that gates the admin page is live.

drop policy if exists "Anyone can view quarter results" on public.super_bowl_quarter_results;
drop policy if exists "Authenticated users can view super bowl config" on public.super_bowl_config;
drop policy if exists "Authenticated users can view processing log" on public.super_bowl_processing_log;
