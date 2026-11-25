'use client';

import { useMemo, useState } from 'react';

import { DashButton, DashInput } from '@/components/studio/dashboard/dash-button';
import { say, sayProblem } from '@/components/studio/dashboard/dash-toast';
import { srOnly } from '@/components/studio/theme';
import { Player } from '@/features/contests/types/player';
import { cn } from '@/utils/cn';
import { copyText } from '@/utils/copy-text';
import { getURL } from '@/utils/get-url';

import css from '../table.module.css';

interface TeamMembersTableClientProps {
  players: Player[];
  salesCounts: Record<string, number>;
  contestId: string;
  contestName: string;
  contestSlug: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function TeamMembersTableClient({
  players,
  salesCounts,
  contestSlug,
  contestName,
}: TeamMembersTableClientProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter players based on search
  const filteredPlayers = useMemo(() => {
    if (!searchQuery) return players;

    const query = searchQuery.toLowerCase();
    return players.filter((player) => {
      const name = player.name.toLowerCase();
      const number = player.number?.toString() || '';
      return name.includes(query) || number.includes(query);
    });
  }, [players, searchQuery]);

  const getReferralLink = (player: Player): string => {
    return `${getURL()}/contest/${contestSlug}?ref=${player.slug}`;
  };

  const copyLink = async (player: Player) => {
    const url = getReferralLink(player);
    if (await copyText(url)) say(`Link copied for ${player.name}`);
    else sayProblem('Something went wrong. Please try again.');
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Number', 'Slug', 'Referral Link', 'Squares Sold'];
    const rows = filteredPlayers.map((player) => {
      const referralLink = getReferralLink(player);
      const salesCount = salesCounts[player.name] || 0;
      return [player.name, player.number?.toString() || '', player.slug, referralLink, salesCount.toString()];
    });

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `${slugify(contestName)}-team-members-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Controls Row */}
      <div className={css.tools}>
        <DashInput
          type='search'
          aria-label='Search by name or number'
          placeholder='Search by name or number...'
          autoComplete='off'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <DashButton look='quiet' onClick={handleExportCSV}>
          Export CSV
        </DashButton>
      </div>

      {/* Table */}
      <table role='table' className={cn(css.table, css.team)}>
        <caption className={srOnly}>Team Members</caption>
        <thead role='rowgroup'>
          <tr role='row'>
            {['Name', 'Referral Link', 'Squares Sold', 'Actions'].map((heading) => (
              <th key={heading} role='columnheader' scope='col'>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role='rowgroup'>
          {filteredPlayers.length === 0 ? (
            <tr role='row' className={css.blank}>
              <td role='cell' colSpan={4}>
                {searchQuery ? 'No team members match your search.' : 'No team members yet.'}
              </td>
            </tr>
          ) : (
            filteredPlayers.map((player) => {
              const salesCount = salesCounts[player.name] || 0;
              return (
                <tr
                  key={player.slug}
                  role='row'
                  onClick={(e) => {
                    // A press anywhere on the row copies the link, except on the button, which does the same
                    if ((e.target as HTMLElement).closest('button')) return;
                    copyLink(player);
                  }}
                >
                  <td role='cell' className={css.member}>
                    {player.name}
                    {player.number !== undefined && <span className={css.soft}> #{player.number}</span>}
                  </td>
                  <td role='cell' className={css.url}>
                    {getReferralLink(player)}
                  </td>
                  <td role='cell'>
                    {salesCount} {salesCount === 1 ? 'square' : 'squares'}
                  </td>
                  <td role='cell'>
                    <DashButton look='quiet' onClick={() => copyLink(player)}>
                      Copy Link<span className={srOnly}> for {player.name}</span>
                    </DashButton>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </>
  );
}
