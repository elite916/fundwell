'use client';

import { type FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { DashInput } from '@/components/studio/dashboard/dash-button';
import { Tag } from '@/components/studio/dashboard/dash-page';
import { say, sayProblem } from '@/components/studio/dashboard/dash-toast';
import { BusyButton } from '@/components/studio/setup/busy-button';
import { srOnly } from '@/components/studio/theme';
import { saveHits } from '@/features/contests/actions/hit-players';
import { HITS_RANGE } from '@/features/contests/constants';
import type { HitPlayerWithHits } from '@/features/contests/queries/get-pledges';
import { formatPrizeAmount } from '@/features/contests/utils';

import css from './run.module.css';

interface HitsSectionProps {
  contestId: string;
  pitches: number;
  /** Sorted by number, then first name. `total` is what their pledges come to with their saved hits. */
  players: (HitPlayerWithHits & { supporters: number; total: number })[];
}

/** Each player's hits, entered by the owner after the event. Empty means not entered yet. */
export function HitsSection({ contestId, pitches, players }: HitsSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(players.map((p) => [p.id, p.hits === null ? '' : String(p.hits)]))
  );
  const [invalid, setInvalid] = useState<Set<string>>(new Set());

  const isValid = (value: string) => value.trim() === '' || (/^\d+$/.test(value.trim()) && Number(value) <= pitches);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const bad = new Set(players.filter((p) => !isValid(values[p.id] ?? '')).map((p) => p.id));
    setInvalid(bad);
    if (bad.size) {
      document.getElementById(`hits-${[...bad][0]}`)?.focus();
      return;
    }

    const entries = players.map((p) => {
      const value = (values[p.id] ?? '').trim();
      return { playerId: p.id, hits: value === '' ? null : Number(value) };
    });

    startTransition(async () => {
      const result = await saveHits(contestId, entries);

      if (!result || result.error) {
        sayProblem(result?.error?.message ?? 'Something went wrong. Please try again.');
        return;
      }

      say('Hits saved');
      router.refresh();
    });
  };

  return (
    <section aria-labelledby='hits' className={css.hits}>
      <h2 id='hits'>Hits</h2>
      <p className={css.intro}>Enter each player&apos;s hits after the event. Pitches per player: {pitches}.</p>

      <form onSubmit={handleSubmit} noValidate>
        <table className={css.hitTable}>
          <caption className={srOnly}>Hits</caption>
          <thead>
            <tr>
              {['Player', 'Hits', 'Supporters', 'Total'].map((heading) => (
                <th key={heading} scope='col'>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td colSpan={4} className={css.blank}>
                  No players yet. Add players to give each one a link.
                </td>
              </tr>
            ) : (
              players.map((player) => (
                <tr key={player.id}>
                  <td className={css.player}>
                    {player.first_name}
                    {player.number !== null && <span className={css.soft}> #{player.number}</span>}
                  </td>
                  <td>
                    <span className={css.hitField}>
                      <DashInput
                        id={`hits-${player.id}`}
                        aria-label={`Hits for ${player.first_name}`}
                        inputMode='numeric'
                        autoComplete='off'
                        value={values[player.id] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [player.id]: e.target.value }))}
                        aria-invalid={invalid.has(player.id) || undefined}
                        aria-describedby={invalid.has(player.id) ? 'hits-error' : undefined}
                      />
                      {player.hits === null && <Tag>No hits yet</Tag>}
                    </span>
                  </td>
                  <td>{player.supporters}</td>
                  <td>{formatPrizeAmount(player.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {invalid.size > 0 && (
          <p id='hits-error' role='alert' className={css.error}>
            {HITS_RANGE(pitches)}
          </p>
        )}

        {players.length > 0 && (
          <BusyButton type='submit' look='quiet' busy={isPending} className={css.save}>
            Save Hits
          </BusyButton>
        )}
      </form>
    </section>
  );
}
