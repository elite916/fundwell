import Link from 'next/link';

import { Tag } from '@/components/studio/dashboard/dash-page';
import type { Database } from '@/libs/supabase/types';

import { formatPrizeAmount } from '../utils';

import css from './contest-card.module.css';

type Contest = Database['public']['Tables']['contests']['Row'] & {
  sport_type?: 'football' | 'baseball';
  squares?: { payment_status: string }[];
};

type ContestStatus = Database['public']['Enums']['contest_status'];

const statusLabels: Record<ContestStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  locked: 'Locked',
  in_progress: 'In progress',
  completed: 'Completed',
};

const statusTones: Partial<Record<ContestStatus, 'now' | 'locked'>> = {
  locked: 'locked',
  in_progress: 'now',
};

interface ContestCardProps {
  contest: Contest;
  claimedCount?: number;
}

/** Figma's Mini board: the first squares filled, as many as are claimed. The list doesn't load which ones. */
function MiniBoard({ claimedCount }: { claimedCount: number }) {
  return (
    <svg className={css.mini} viewBox='0 0 66 66' aria-hidden='true'>
      <rect width='66' height='66' rx='4' className={css.miniBed} />
      {Array.from({ length: 100 }, (_, i) => (
        <rect
          key={i}
          x={4 + (i % 10) * 6}
          y={4 + Math.floor(i / 10) * 6}
          width='4'
          height='4'
          className={i < claimedCount ? css.miniClaimed : css.miniOpen}
        />
      ))}
    </svg>
  );
}

export function ContestCard({ contest, claimedCount = 0 }: ContestCardProps) {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(contest.created_at));

  return (
    <Link href={`/dashboard/${contest.id}`} className={css.card}>
      <div className={css.top}>
        {/* Squares only */}
        {contest.kind !== 'hit_a_thon' && <MiniBoard claimedCount={claimedCount} />}
        <div className={css.head}>
          <h2>{contest.name}</h2>
          <Tag tone={statusTones[contest.status] ?? 'quiet'}>{statusLabels[contest.status]}</Tag>
        </div>
      </div>
      {contest.kind === 'hit_a_thon' ? (
        // No teams, price or squares
        <p className={css.meta}>
          <span>Hit-a-thon</span>
          <span className={css.soft}>{formattedDate}</span>
        </p>
      ) : (
        <p className={css.meta}>
          <span>
            {contest.row_team_name} <span className={css.soft}>vs</span> {contest.col_team_name}
          </span>
          <span>
            <b>{formatPrizeAmount(Number(contest.square_price))}</b> <span className={css.soft}>/sq</span>
          </span>
          <span className={css.soft}>{formattedDate}</span>
          <span>
            <b>{claimedCount}</b>
            <span className={css.soft}>/100</span>
          </span>
        </p>
      )}
    </Link>
  );
}
