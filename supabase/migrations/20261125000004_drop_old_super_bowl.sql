-- Manual Super Bowl scores, phase B: the old automatic scoring is gone, and nothing
-- uses its tables or the old flag. No cascade, so this fails if something still does.
drop table public.super_bowl_quarter_results;
drop table public.super_bowl_processing_log;
drop table public.super_bowl_config;

alter table public.contests drop column is_super_bowl;
