import Link from 'next/link';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { BackLink, DashPage, Tag } from '@/components/studio/dashboard/dash-page';
import { getContestPinForOwner, getHitPlayersWithHits, getPledgesForOwner } from '@/features/contests/queries';
import type { Contest } from '@/features/contests/types';
import { formatPrizeAmount } from '@/features/contests/utils';
import { pledgeTotal, sumMoney } from '@/features/contests/utils/pledges';
import { cn } from '@/utils/cn';
import { getURL } from '@/utils/get-url';

import { ContestStatusButton } from './contest-status-button';
import { CopyLinkButton } from './copy-link-button';
import { HitsSection } from './hits-section';

import css from './run.module.css';

interface HitAThonOverviewProps {
  contest: Contest;
  statusLabel: string;
}

/**
 * A hit-a-thon's overview: what's been pledged, owed and paid, and each player's hits. Before hits are locked,
 * "Pledged" counts each per-hit pledge at its most (the decided rule); a player's "Total" uses their entered hits.
 */
export async function HitAThonOverview({ contest, statusLabel }: HitAThonOverviewProps) {
  const pitches = contest.pitches_per_player ?? 0;

  const [players, pledges, accessPin] = await Promise.all([
    getHitPlayersWithHits(contest.id),
    getPledgesForOwner(contest.id),
    getContestPinForOwner(contest.id),
  ]);

  const owedOf = (status: 'pending' | 'paid') =>
    sumMoney(pledges.filter((p) => p.status === status).map((p) => Number(p.amount_owed ?? 0)));

  const stats = [
    { label: 'Pledged', value: formatPrizeAmount(sumMoney(pledges.map((p) => pledgeTotal(p, null, pitches)))) },
    { label: 'Owed', value: formatPrizeAmount(owedOf('pending')) },
    { label: 'Paid', value: formatPrizeAmount(owedOf('paid')) },
    { label: 'Supporters', value: pledges.length },
  ];

  const rows = players.map((player) => {
    const theirs = pledges.filter((p) => p.player_id === player.id);
    return {
      ...player,
      supporters: theirs.length,
      total: sumMoney(theirs.map((p) => pledgeTotal(p, player.hits, pitches))),
    };
  });

  const publicUrl = getURL(`/contest/${contest.slug}`);

  return (
    <DashPage>
      <BackLink href='/dashboard'>Back to Dashboard</BackLink>

      <div className={css.run}>
        {/* Header */}
        <div className={css.head}>
          <div>
            <div className={css.title}>
              <h1>{contest.name}</h1>
              <Tag className={css.status}>{statusLabel}</Tag>
            </div>
            {contest.description && <p className={css.about}>{contest.description}</p>}
          </div>

          <div className={css.row}>
            <CopyLinkButton url={publicUrl} code={accessPin} contestName={contest.name} />
            <DashButton asChild look='quiet'>
              <Link href={`/dashboard/${contest.id}/settings`}>Settings</Link>
            </DashButton>
          </div>
        </div>

        <div className={css.side}>
          {/* Quick Actions */}
          <section aria-labelledby='quick-actions' className={cn(css.card, css.quick)}>
            <h2 id='quick-actions' tabIndex={-1}>
              Quick Actions
            </h2>
            <p>Manage your contest</p>
            <div className={css.acts}>
              <ContestStatusButton
                contestId={contest.id}
                currentStatus={contest.status}
                isHitAThon
                className={css.go}
              />

              <Link href={`/contest/${contest.slug}`} target='_blank'>
                View Public Page
              </Link>

              <Link href={`/dashboard/${contest.id}/participants`}>Manage Pledges</Link>

              <Link href={`/dashboard/${contest.id}/team-members`}>Manage Players</Link>
            </div>
          </section>
        </div>

        {/* Summary */}
        <dl className={cn(css.stats, css.four)}>
          {stats.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <b>{value}</b>
              </dd>
            </div>
          ))}
        </dl>

        <HitsSection contestId={contest.id} pitches={pitches} players={rows} />
      </div>
    </DashPage>
  );
}
