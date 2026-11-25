-- The old score-polling job is off, but its command and run history hold a key.
do $$
begin
  if to_regclass('cron.job') is not null then
    delete from cron.job_run_details
    where jobid in (select jobid from cron.job where jobname = 'check-super-bowl-scores');

    perform cron.unschedule(jobid) from cron.job where jobname = 'check-super-bowl-scores';
  end if;
end;
$$;
