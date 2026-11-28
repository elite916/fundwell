import Link from 'next/link';
import { after } from 'next/server';
import type { ComponentProps } from 'react';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { BackLink, DashPage, Tag } from '@/components/studio/dashboard/dash-page';
import {
  getContestPinForOwner,
  getHitPlayersWithHits,
  getPaymentOptionsForContest,
  getPledgesForOwner,
} from '@/features/contests/queries';
import type { Contest } from '@/features/contests/types';
import { formatPrizeAmount } from '@/features/contests/utils';
import { pledgeTotal, sumMoney } from '@/features/contests/utils/pledges';
import { countTotalsSent, resumeHitAThonEmails } from '@/features/emails/hit-a-thon-emails';
import { cn } from '@/utils/cn';
import { getURL } from '@/utils/get-url';

import { ContestStatusButton } from './contest-status-button';
import { CopyLinkButton } from './copy-link-button';
import { HitsSection } from './hits-section';

import css from './run.module.css';

interface HitAThonOverviewProps {
  contest: Contest;
  statusLabel: string;
  statusTone: ComponentProps<typeof Tag>['tone'];
}

/**
 * A hit-a-thon's overview: what's been pledged, owed and paid, and each player's hits. Before hits are locked,
 * "Pledged" counts each per-hit pledge at its most (the decided rule); a player's "Total" uses their entered hits.
 */
export async function HitAThonOverview({ contest, statusLabel, statusTone }: HitAThonOverviewProps) {
  const pitches = contest.pitches_per_player ?? 0;

  const [players, pledges, accessPin, paymentOptions, totalsSent] = await Promise.all([
    getHitPlayersWithHits(contest.id),
    getPledgesForOwner(contest.id),
    getContestPinForOwner(contest.id),
    getPaymentOptionsForContest(contest.id),
    contest.hits_locked_at ? countTotalsSent(contest.id) : 0,
  ]);

  // Sends what an earlier lock, reminder or payment left queued (or didn't get to queue), after the page is sent
  after(() => resumeHitAThonEmails(contest));

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

  // Formatted here, so the server and the browser show the same day
  const locked = contest.hits_locked_at
    ? {
        on: new Date(contest.hits_locked_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'America/Los_Angeles',
        }),
        totalsSent,
      }
    : null;
  // Who gets a total: per-hit pledges, and flat gifts not yet paid
  const lock =
    !contest.hits_locked_at && (contest.status === 'open' || contest.status === 'locked')
      ? {
          hasPaymentOption: paymentOptions.length > 0,
          supportersToEmail: pledges.filter(
            (p) => (p.kind === 'per_hit' && p.status === 'pledged') || (p.kind === 'flat' && p.status === 'pending')
          ).length,
        }
      : null;

  return (
    <DashPage>
      <div className={css.run}>
        {/* In the grid, so Quick Actions starts level with it */}
        <BackLink href='/dashboard' className={css.back}>
          Back to Dashboard
        </BackLink>

        {/* Header */}
        <div className={css.head}>
          <div>
            {/* Figma puts the chip under the name */}
            <div className={cn(css.title, css.under)}>
              <h1>{contest.name}</h1>
              <Tag tone={statusTone}>{statusLabel}</Tag>
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

        <HitsSection contestId={contest.id} pitches={pitches} players={rows} locked={locked} lock={lock} />
      </div>
    </DashPage>
  );
}
