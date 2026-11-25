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
  in_progress: 'In Progress',
  completed: 'Completed',
};

interface ContestCardProps {
  contest: Contest;
  claimedCount?: number;
}

/** A tiny board with as many tiles raised as squares are claimed. The list doesn't load which ones. */
function MiniBoard({ claimedCount }: { claimedCount: number }) {
  return (
    <svg className={css.mini} viewBox='0 0 64 64' aria-hidden='true'>
      <rect x='5' y='5' width='54' height='54' rx='3' fill='#b3b6b6' />
      {Array.from({ length: 100 }, (_, i) => (
        <rect
          key={i}
          x={(5.6 + (i % 10) * 5.3).toFixed(1)}
          y={(5.6 + Math.floor(i / 10) * 5.3 - (i < claimedCount ? 0.5 : 0)).toFixed(1)}
          width='4.7'
          height='4.7'
          rx='0.9'
          fill={i < claimedCount ? '#fff' : '#cdd0d0'}
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
      <MiniBoard claimedCount={claimedCount} />
      <h2>{contest.name}</h2>
      <Tag tone={contest.status === 'in_progress' ? 'now' : 'quiet'} className={css.tag}>
        {statusLabels[contest.status]}
      </Tag>
      <p className={css.meta}>
        <span>
          {contest.row_team_name} <span className={css.soft}>vs</span> {contest.col_team_name}
        </span>
        <span>
          <b>{formatPrizeAmount(Number(contest.square_price))}</b> <span className={css.soft}>/sq</span>
        </span>
        <span className={css.date}>{formattedDate}</span>
        <span>
          <b>{claimedCount}</b>
          <span className={css.soft}>/100</span>
        </span>
      </p>
    </Link>
  );
}
