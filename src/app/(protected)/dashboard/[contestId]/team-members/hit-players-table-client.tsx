'use client';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { srOnly } from '@/components/studio/theme';
import { useToast } from '@/components/ui/use-toast';
import { formatPrizeAmount } from '@/features/contests/utils';
import type { HitPlayer } from '@/features/contests/utils/hit-players';
import { cn } from '@/utils/cn';
import { copyText } from '@/utils/copy-text';
import { getURL } from '@/utils/get-url';

import css from '../table.module.css';

interface HitPlayersTableClientProps {
  players: HitPlayer[];
  totals: Record<string, { supporters: number; pledged: number }>;
  contestSlug: string;
}

/** A hit-a-thon's players, with their links and what's been pledged to each. */
export function HitPlayersTableClient({ players, totals, contestSlug }: HitPlayersTableClientProps) {
  const { toast } = useToast();

  const getLink = (player: HitPlayer): string => `${getURL()}/contest/${contestSlug}?ref=${player.slug}`;

  const copyLink = async (player: HitPlayer) => {
    if (!(await copyText(getLink(player)))) {
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong. Please try again.' });
      return;
    }
    toast({ title: 'Link copied', description: `Link for ${player.first_name} copied to clipboard.` });
  };

  return (
    <table role='table' className={cn(css.table, css.team, css.players)}>
      <caption className={srOnly}>Players</caption>
      <thead role='rowgroup'>
        <tr role='row'>
          {['Name', 'Link', 'Supporters', 'Pledged', 'Actions'].map((heading) => (
            <th key={heading} role='columnheader' scope='col'>
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody role='rowgroup'>
        {players.length === 0 ? (
          <tr role='row' className={css.blank}>
            <td role='cell' colSpan={5}>
              No players yet. Add players to give each one a link.
            </td>
          </tr>
        ) : (
          players.map((player) => {
            const total = totals[player.id] ?? { supporters: 0, pledged: 0 };
            return (
              <tr
                key={player.id}
                role='row'
                onClick={(e) => {
                  // A press anywhere on the row copies the link, except on the button, which does the same
                  if ((e.target as HTMLElement).closest('button')) return;
                  copyLink(player);
                }}
              >
                <td role='cell' className={css.member}>
                  {player.first_name}
                  {player.number !== null && <span className={css.soft}> #{player.number}</span>}
                </td>
                <td role='cell' className={css.url}>
                  {getLink(player)}
                </td>
                <td role='cell'>{total.supporters}</td>
                <td role='cell'>{formatPrizeAmount(total.pledged)}</td>
                <td role='cell'>
                  <DashButton look='quiet' onClick={() => copyLink(player)}>
                    Copy Link<span className={srOnly}> for {player.first_name}</span>
                  </DashButton>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
