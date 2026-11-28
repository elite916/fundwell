'use client';

import { type FormEvent, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { DashButton, DashInput } from '@/components/studio/dashboard/dash-button';
import { DashDialog, DashDialogFoot } from '@/components/studio/dashboard/dash-dialog';
import { Tag } from '@/components/studio/dashboard/dash-page';
import { say, sayProblem } from '@/components/studio/dashboard/dash-toast';
import { BusyButton } from '@/components/studio/setup/busy-button';
import { srOnly } from '@/components/studio/theme';
import { saveHits } from '@/features/contests/actions/hit-players';
import { lockHitAThon } from '@/features/contests/actions/send-totals';
import { HitAThonErrors, HITS_LEFT, HITS_RANGE } from '@/features/contests/constants';
import type { HitPlayerWithHits } from '@/features/contests/queries/get-pledges';
import { formatPrizeAmount } from '@/features/contests/utils';

import css from './run.module.css';

interface HitsSectionProps {
  contestId: string;
  pitches: number;
  /** Sorted by number, then first name. `total` is what their pledges come to with their saved hits. */
  players: (HitPlayerWithHits & { supporters: number; total: number })[];
  /** Hits are locked: when (already formatted) and how many supporters were sent their totals. */
  locked: { on: string; totalsSent: number } | null;
  /** "Lock and Send Totals", while pledges are open or closed. */
  lock: { hasPaymentOption: boolean; supportersToEmail: number } | null;
}

const supporters = (n: number) => `${n} ${n === 1 ? 'supporter' : 'supporters'}`;

/** Each player's hits, entered by the owner after the event. Empty means not entered yet. */
export function HitsSection({ contestId, pitches, players, locked, lock }: HitsSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLocking, startLocking] = useTransition();
  const isLockedRef = useRef(false);
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

  // Saved counts, not what's typed: the lock uses what's saved
  const hitsLeft = players.filter((p) => p.hits === null).length;
  const lockReasons = [
    hitsLeft > 0 && HITS_LEFT(hitsLeft),
    lock && !lock.hasPaymentOption && HitAThonErrors.PAYMENT_OPTION_FIRST,
  ].filter((reason): reason is string => !!reason);
  const showsLock = !!lock && players.length > 0;
  // Save Hits is the main button until every player has hits, then Lock and Send Totals is
  const lockIsMain = showsLock && hitsLeft === 0;

  const handleLock = () => {
    startLocking(async () => {
      const result = await lockHitAThon(contestId);

      if (!result || result.error) {
        sayProblem(result?.error?.message ?? 'Something went wrong. Please try again.');
        setIsConfirming(false);
        return;
      }

      say('Totals sent');
      isLockedRef.current = true;
      setIsConfirming(false);
      router.refresh();
    });
  };

  return (
    <section aria-labelledby='hits' className={css.hits}>
      <h2 id='hits' tabIndex={-1}>
        Hits
      </h2>
      <p className={css.intro}>Enter each player&apos;s hits after the event. Pitches per player: {pitches}.</p>
      {locked && (
        <p className={css.lockedOn}>
          Hits locked on {locked.on}. Totals sent to {supporters(locked.totalsSent)}.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* The roles keep it a table where phones lay it out another way */}
        <table role='table' className={css.hitTable}>
          <caption className={srOnly}>Hits</caption>
          <thead role='rowgroup'>
            <tr role='row'>
              {['Player', 'Hits', 'Supporters', 'Total'].map((heading) => (
                <th key={heading} role='columnheader' scope='col'>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody role='rowgroup'>
            {players.length === 0 ? (
              <tr role='row'>
                <td role='cell' colSpan={4} className={css.blank}>
                  No players yet. Add players to give each one a link.
                </td>
              </tr>
            ) : (
              players.map((player) => (
                <tr key={player.id} role='row'>
                  <td role='cell' className={css.player}>
                    {player.first_name}
                    {player.number !== null && <span className={css.soft}> #{player.number}</span>}
                  </td>
                  <td role='cell' className={locked ? undefined : css.hitCell}>
                    {locked ? (
                      player.hits
                    ) : (
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
                        {player.hits === null && <Tag className={css.noHits}>No hits yet</Tag>}
                      </span>
                    )}
                  </td>
                  <td role='cell'>{player.supporters}</td>
                  <td role='cell'>{formatPrizeAmount(player.total)}</td>
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

        {players.length > 0 && !locked && (
          <div className={css.save}>
            <BusyButton type='submit' look={lockIsMain ? 'quiet' : 'main'} busy={isPending}>
              Save Hits
            </BusyButton>
            {showsLock && (
              <DashButton
                look={lockIsMain ? 'main' : 'quiet'}
                onClick={() => setIsConfirming(true)}
                disabled={lockReasons.length > 0 || isLocking}
                aria-describedby={lockReasons.length > 0 ? 'lock-why' : undefined}
              >
                Lock and Send Totals
              </DashButton>
            )}
          </div>
        )}
        {showsLock && lockReasons.length > 0 && (
          <p id='lock-why' className={css.intro}>
            {lockReasons.join(' ')}
          </p>
        )}
      </form>

      {lock && (
        <DashDialog
          open={isConfirming}
          onClose={() => !isLocking && setIsConfirming(false)}
          title='Lock hits and send totals?'
          description={`Fundwell will email ${supporters(lock.supportersToEmail)} their totals and your payment options. Pledges close, and you won't be able to change any player's hits after this.`}
          // The button goes away once the hits are locked
          endFocus={() => (isLockedRef.current ? document.getElementById('hits') : null)}
        >
          <DashDialogFoot>
            <DashButton look='quiet' onClick={() => setIsConfirming(false)} disabled={isLocking}>
              Cancel
            </DashButton>
            <BusyButton busy={isLocking} onClick={handleLock}>
              Lock and Send
            </BusyButton>
          </DashDialogFoot>
        </DashDialog>
      )}
    </section>
  );
}
