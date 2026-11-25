import { Panel } from '@/components/studio/dashboard/dash-page';

import css from '@/components/studio/setup/setup.module.css';

interface UsageCardProps {
  activeContests: number;
  limit: number | null;
}

export function UsageCard({ activeContests, limit }: UsageCardProps) {
  const isUnlimited = limit === null;
  const percentage = isUnlimited ? 0 : limit > 0 ? Math.min(100, (activeContests / limit) * 100) : 0;
  const isNearLimit = !isUnlimited && limit > 0 && activeContests >= limit * 0.8;
  const isAtLimit = !isUnlimited && limit > 0 && activeContests >= limit;

  const displayCount = isUnlimited ? `${activeContests} / ∞` : `${activeContests} / ${limit}`;

  return (
    <Panel>
      <h2 className={css.figureLabel}>Active Contests</h2>
      <p className={css.figure}>{displayCount}</p>
      {!isUnlimited && (
        <>
          <div className={`${css.bars} ${css.usage}`} aria-hidden='true'>
            <i style={{ width: `${percentage}%` }} />
          </div>
          {isAtLimit && <p>Limit reached</p>}
          {isNearLimit && !isAtLimit && <p>Approaching limit</p>}
        </>
      )}
    </Panel>
  );
}
