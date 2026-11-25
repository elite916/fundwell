import 'server-only';

function getSeason(): number {
  // For tests only
  const override = Number(process.env.SUPER_BOWL_SEASON);
  return process.env.VERCEL_ENV !== 'production' && Number.isInteger(override) && override > 0 ? override : 2027;
}

/** The Super Bowl Fundwell is scoring. Contests of any other season are never touched. */
export const SUPER_BOWL_SEASON = getSeason();
