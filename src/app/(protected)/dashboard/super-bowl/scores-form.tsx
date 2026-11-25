'use client';

import { type FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashButton, DashInput } from '@/components/studio/dashboard/dash-button';
import { DashDialog, DashDialogFoot } from '@/components/studio/dashboard/dash-dialog';
import { say, sayProblem } from '@/components/studio/dashboard/dash-toast';
import { BusyButton } from '@/components/studio/setup/busy-button';
import { srOnly } from '@/components/studio/theme';
import { QuarterDisplayNames } from '@/features/contests/constants';
import { applySuperBowlScores, previewSuperBowlScores, saveSuperBowlScores } from '@/features/super-bowl/actions';
import { SUPER_BOWL_QUARTERS } from '@/features/super-bowl/constants';
import type { SuperBowlApplyResult, SuperBowlGame, SuperBowlScores } from '@/features/super-bowl/types';

import { useAction } from './use-action';

import css from './super-bowl.module.css';

interface Review {
  scores: SuperBowlScores;
  contests: number;
  winners: number;
}

/** Null when it's blank. The server refuses anything that isn't a score. */
function readScore(data: FormData, name: string): number | null {
  const text = String(data.get(name) ?? '').trim();
  if (text === '') return null;
  return /^\d+$/.test(text) ? Number(text) : NaN;
}

function readScores(form: HTMLFormElement): SuperBowlScores {
  const data = new FormData(form);
  return Object.fromEntries(
    SUPER_BOWL_QUARTERS.map((quarter) => [
      quarter,
      { afc: readScore(data, `${quarter}_afc`), nfc: readScore(data, `${quarter}_nfc`) },
    ])
  ) as SuperBowlScores;
}

export function ScoresForm({ game }: { game: SuperBowlGame | null }) {
  const router = useRouter();
  const reviewRef = useRef<HTMLButtonElement>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [isReviewing, runReview] = useAction();
  const [isSaving, runSave] = useAction();
  const [isApplying, runApply] = useAction();

  const teams = [
    { key: 'afc', name: game?.afc_team ?? 'AFC team' },
    { key: 'nfc', name: game?.nfc_team ?? 'NFC team' },
  ] as const;
  const saved = SUPER_BOWL_QUARTERS.map((quarter) => [game?.[`${quarter}_afc`], game?.[`${quarter}_nfc`]]);

  const handleReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const scores = readScores(event.currentTarget);
    runReview(
      () => previewSuperBowlScores(scores),
      (counts) => setReview({ scores, ...counts })
    );
  };

  const handleApplied = ({ contestsUpdated, failed }: SuperBowlApplyResult) => {
    if (failed.length > 0) sayProblem('An unexpected error occurred');
    else say(`Scores saved. ${contestsUpdated} contests updated.`);
    setReview(null);
    router.refresh();
  };

  return (
    <>
      <form onSubmit={handleReview} className={css.form}>
        {/* The key shows the scores as they were saved. What is typed stays through every other refresh. */}
        <table key={saved.join('|')} className={css.scores}>
          <caption className={srOnly}>Scores</caption>
          <thead>
            <tr>
              <td />
              {teams.map(({ key, name }) => (
                <th key={key} scope='col'>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SUPER_BOWL_QUARTERS.map((quarter) => (
              <tr key={quarter}>
                <th scope='row'>{QuarterDisplayNames[quarter]}</th>
                {teams.map(({ key, name }) => (
                  <td key={key}>
                    <DashInput
                      name={`${quarter}_${key}`}
                      aria-label={`${QuarterDisplayNames[quarter]}, ${name}`}
                      defaultValue={game?.[`${quarter}_${key}`] ?? ''}
                      inputMode='numeric'
                      maxLength={2}
                      autoComplete='off'
                      className={css.score}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className={css.buttons}>
          <BusyButton ref={reviewRef} busy={isReviewing} type='submit'>
            Review Scores
          </BusyButton>
          {saved.flat().some((score) => typeof score === 'number') && (
            <BusyButton
              busy={isApplying}
              look='quiet'
              onClick={() => runApply(() => applySuperBowlScores(), handleApplied)}
            >
              Apply Scores Again
            </BusyButton>
          )}
        </div>
      </form>

      <DashDialog
        open={review !== null}
        onClose={() => setReview(null)}
        title='Check the scores'
        description={review && `This updates ${review.contests} contests and emails ${review.winners} winners.`}
        // The button was disabled while the dialog opened, so focus isn't on it anymore
        endFocus={() => reviewRef.current}
      >
        {review && (
          <>
            <table className={css.scores}>
              <caption className={srOnly}>Scores</caption>
              <thead>
                <tr>
                  <td />
                  {teams.map(({ key, name }) => (
                    <th key={key} scope='col'>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUPER_BOWL_QUARTERS.map((quarter) => (
                  <tr key={quarter}>
                    <th scope='row'>{QuarterDisplayNames[quarter]}</th>
                    {teams.map(({ key }) => (
                      <td key={key} className={css.check}>
                        {review.scores[quarter][key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <DashDialogFoot>
              <DashButton look='quiet' onClick={() => setReview(null)} disabled={isSaving}>
                Cancel
              </DashButton>
              <BusyButton
                busy={isSaving}
                onClick={() => runSave(() => saveSuperBowlScores(review.scores), handleApplied)}
              >
                {isSaving ? 'Saving...' : 'Save Scores'}
              </BusyButton>
            </DashDialogFoot>
          </>
        )}
      </DashDialog>
    </>
  );
}
