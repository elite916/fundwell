import Link from 'next/link';

import { Tag } from '@/components/studio/dashboard/dash-page';
import { srOnly } from '@/components/studio/theme';
import { QuarterDisplayNames } from '@/features/contests/constants';
import { SUPER_BOWL_QUARTERS } from '@/features/super-bowl/constants';
import type { getSuperBowlPage } from '@/features/super-bowl/queries';
import type { SuperBowlGame, SuperBowlProblem } from '@/features/super-bowl/types';
import { cn } from '@/utils/cn';

import { RowTeamForm } from './row-team-form';

import css from './super-bowl.module.css';

const STATUS_LABELS = {
  draft: 'Draft',
  open: 'Open',
  locked: 'Locked',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const PROBLEM_LABELS: Record<SuperBowlProblem, string> = {
  not_started: 'Not started',
  no_numbers: 'No numbers',
  names_dont_match: "Team names don't match",
};

interface ContestsTableProps {
  contests: Awaited<ReturnType<typeof getSuperBowlPage>>['contests'];
  game: SuperBowlGame | null;
}

/** The roles keep it a table where narrow screens lay it out another way. */
export function ContestsTable({ contests, game }: ContestsTableProps) {
  return (
    <table role='table' className={css.contests}>
      <caption className={srOnly}>Contests</caption>
      <thead role='rowgroup'>
        <tr role='row'>
          {['Contest', 'Status', ...SUPER_BOWL_QUARTERS.map((quarter) => QuarterDisplayNames[quarter])].map(
            (heading) => (
              <th key={heading} role='columnheader' scope='col'>
                {heading}
              </th>
            )
          )}
        </tr>
      </thead>
      <tbody role='rowgroup'>
        {contests.length === 0 && (
          <tr role='row'>
            <td role='cell' colSpan={6}>
              —
            </td>
          </tr>
        )}
        {contests.map((contest) => (
          <tr key={contest.id} role='row'>
            <td role='cell' className={css.contest}>
              <Link id={`contest-${contest.id}`} href={`/contest/${contest.slug}`}>
                {contest.name}
              </Link>
              <p>
                {contest.rowTeamName} vs {contest.colTeamName}
              </p>
              {game && contest.problem === 'names_dont_match' && (
                <RowTeamForm
                  contestId={contest.id}
                  contestName={contest.name}
                  afcTeam={game.afc_team}
                  nfcTeam={game.nfc_team}
                />
              )}
            </td>
            <td role='cell' className={css.status}>
              {contest.status && (
                <Tag tone={contest.status === 'in_progress' ? 'now' : 'quiet'}>{STATUS_LABELS[contest.status]}</Tag>
              )}
              {contest.problem && <Tag tone='owes'>{PROBLEM_LABELS[contest.problem]}</Tag>}
            </td>
            {SUPER_BOWL_QUARTERS.map((quarter) => {
              const score = contest.scores[quarter];
              return (
                <td key={quarter} role='cell' className={cn(css.quarter, !score && css.soft)}>
                  <span aria-hidden='true' className={css.lead}>
                    {QuarterDisplayNames[quarter]}
                  </span>
                  <span>{score ? `${score.home_score} - ${score.away_score}` : '—'}</span>
                  {score?.source === 'organizer' && <Tag>Entered by organizer</Tag>}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
