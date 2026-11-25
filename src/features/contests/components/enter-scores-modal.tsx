'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';

import { DashButton, DashInput } from '@/components/studio/dashboard/dash-button';
import { DashDialog, DashDialogFoot } from '@/components/studio/dashboard/dash-dialog';
import { Note } from '@/components/studio/dashboard/dash-page';
import { say, sayProblem } from '@/components/studio/dashboard/dash-toast';
import { Database } from '@/libs/supabase/types';
import { cn } from '@/utils/cn';

import { saveScores } from '../actions/save-scores';
import { FOOTBALL_QUARTER_LABELS } from '../constants';
import { GridSquare } from '../queries/get-squares';
import { ContestPrizeFields } from '../types';
import { calculatePrizeAmount, countSoldSquares, formatPrizeAmount, getPrizeText } from '../utils';
import { changedScores } from '../utils/changed-scores';
import { findWinningSquare } from '../utils/find-winning-square';

import css from './enter-scores-modal.module.css';

type Score = Database['public']['Tables']['scores']['Row'];
type GameQuarter = Database['public']['Enums']['game_quarter'];
type SportType = Database['public']['Enums']['sport_type'];
type ContestStatus = Database['public']['Enums']['contest_status'];

interface Contest extends ContestPrizeFields {
  id: string;
  sport_type: SportType;
  row_team_name: string;
  col_team_name: string;
  row_numbers: number[] | null;
  col_numbers: number[] | null;
  status: ContestStatus;
  square_price: number;
  payout_q1_percent: number | null;
  payout_q2_percent: number | null;
  payout_q3_percent: number | null;
  payout_final_percent: number | null;
  payout_game1_percent: number | null;
  payout_game2_percent: number | null;
  payout_game3_percent: number | null;
  payout_game4_percent: number | null;
  payout_game5_percent: number | null;
  payout_game6_percent: number | null;
  payout_game7_percent: number | null;
}

interface EnterScoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  contest: Contest;
  existingScores: Score[];
  squares: GridSquare[];
  onSuccess?: () => void;
}

type TypedScores = Partial<Record<GameQuarter, { homeScore?: string; awayScore?: string }>>;

interface ScoreEntry {
  quarter: GameQuarter;
  label: string;
  homeScore: string;
  awayScore: string;
  payoutPercent: number | null;
}

const FOOTBALL_QUARTERS = FOOTBALL_QUARTER_LABELS.map((q) => ({
  quarter: q.key as GameQuarter,
  label: q.label,
  payoutKey: q.dbField as keyof Contest,
}));

const BASEBALL_GAMES: { quarter: GameQuarter; label: string; payoutKey: keyof Contest }[] = [
  { quarter: 'q1', label: 'Game 1', payoutKey: 'payout_game1_percent' },
  { quarter: 'q2', label: 'Game 2', payoutKey: 'payout_game2_percent' },
  { quarter: 'q3', label: 'Game 3', payoutKey: 'payout_game3_percent' },
  { quarter: 'final', label: 'Game 4', payoutKey: 'payout_game4_percent' },
];

function getQuarterConfig(sportType: SportType) {
  return sportType === 'football' ? FOOTBALL_QUARTERS : BASEBALL_GAMES;
}

function getWinnerDisplay(
  homeScore: string,
  awayScore: string,
  rowNumbers: number[] | null,
  colNumbers: number[] | null,
  squares: GridSquare[]
): { text: string; isWinner: boolean } {
  const home = parseInt(homeScore, 10);
  const away = parseInt(awayScore, 10);

  if (isNaN(home) || isNaN(away)) {
    return { text: 'Enter scores', isWinner: false };
  }

  if (!rowNumbers || !colNumbers) {
    return { text: 'Numbers not assigned', isWinner: false };
  }

  const winningSquare = findWinningSquare(squares, rowNumbers, colNumbers, home, away);

  if (!winningSquare) {
    return { text: 'No matching square', isWinner: false };
  }

  if (winningSquare.claimant_first_name) {
    let name = winningSquare.claimant_first_name;
    if (winningSquare.claimant_last_name) {
      name += ` ${winningSquare.claimant_last_name}`;
    }
    return { text: name, isWinner: true };
  }

  return {
    text: `Row ${winningSquare.row_index + 1}, Col ${winningSquare.col_index + 1}`,
    isWinner: true,
  };
}

export function EnterScoresModal({
  isOpen,
  onClose,
  contest,
  existingScores,
  squares,
  onSuccess,
}: EnterScoresModalProps) {
  const [isPending, startTransition] = useTransition();
  // What was typed since the scores were last loaded. Kept while the dialog is closed, so a stray tap loses nothing.
  const [typed, setTyped] = useState<TypedScores>({});
  const [loadedScores, setLoadedScores] = useState(existingScores);
  const firstEmptyRef = useRef<HTMLInputElement>(null);

  if (loadedScores !== existingScores) {
    setLoadedScores(existingScores);
    setTyped({});
  }

  const quarterConfig = getQuarterConfig(contest.sport_type);
  const squaresSold = countSoldSquares(squares);

  const scoreEntries = quarterConfig.map(({ quarter, label, payoutKey }): ScoreEntry => {
    const existingScore = existingScores.find((s) => s.quarter === quarter);
    return {
      quarter,
      label,
      homeScore: typed[quarter]?.homeScore ?? existingScore?.home_score?.toString() ?? '',
      awayScore: typed[quarter]?.awayScore ?? existingScore?.away_score?.toString() ?? '',
      payoutPercent: contest[payoutKey] as number | null,
    };
  });
  const firstEmpty = scoreEntries.find((entry) => entry.homeScore === '' || entry.awayScore === '');

  const handleScoreChange = (quarter: GameQuarter, field: 'homeScore' | 'awayScore', value: string) => {
    // Only allow numbers
    if (value !== '' && !/^\d+$/.test(value)) {
      return;
    }

    setTyped((prev) => ({ ...prev, [quarter]: { ...prev[quarter], [field]: value } }));
  };

  const handleSave = () => {
    const { changed: scoresToSave, hasIncomplete } = changedScores(scoreEntries, existingScores);

    if (scoresToSave.length === 0) {
      if (hasIncomplete || existingScores.length === 0) {
        sayProblem('Please enter at least one complete score.');
      } else {
        onClose();
      }
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveScores(contest.id, scoresToSave);

        if (result?.error) {
          sayProblem(result.error.message);
          return;
        }

        say(`${scoresToSave.length} score(s) updated successfully.`);

        onSuccess?.();
        onClose();
      } catch (error) {
        sayProblem('An unexpected error occurred. Please try again.');
      }
    });
  };

  // Status check - show message if not in progress
  if (contest.status !== 'in_progress') {
    return (
      <DashDialog
        open={isOpen}
        onClose={onClose}
        title='Enter Scores'
        description='Scores can only be entered during the game.'
      >
        <Note>Change contest status to &ldquo;In Progress&rdquo; to enter scores.</Note>
        <DashDialogFoot>
          <DashButton asChild look='quiet'>
            <Link href={`/dashboard/${contest.id}/settings`}>Go to Settings</Link>
          </DashButton>
          <DashButton look='quiet' onClick={onClose}>
            Close
          </DashButton>
        </DashDialogFoot>
      </DashDialog>
    );
  }

  const teams = [
    { field: 'homeScore', label: `${contest.row_team_name} (Home)` },
    { field: 'awayScore', label: `${contest.col_team_name} (Away)` },
  ] as const;

  return (
    <DashDialog
      open={isOpen}
      onClose={onClose}
      size='wide'
      startRef={firstEmptyRef}
      title='Enter Scores'
      description={`Enter the scores for each ${
        contest.sport_type === 'football' ? 'quarter' : 'game'
      }. Winners are calculated automatically.`}
    >
      <div className={css.scores}>
        {/* Team Labels */}
        <div aria-hidden='true' className={css.labels}>
          <span />
          {teams.map(({ field, label }) => (
            <span key={field}>{label}</span>
          ))}
          <span>Winner</span>
        </div>

        {/* Score Entry Rows */}
        {scoreEntries.map((entry) => {
          const winner = getWinnerDisplay(
            entry.homeScore,
            entry.awayScore,
            contest.row_numbers,
            contest.col_numbers,
            squares
          );

          const payoutAmount =
            entry.payoutPercent != null
              ? calculatePrizeAmount(squaresSold, contest.square_price, entry.payoutPercent)
              : null;
          const prizeText = getPrizeText(contest.prize_type, entry.quarter, contest);

          return (
            <div key={entry.quarter} role='group' aria-labelledby={`score-${entry.quarter}`} className={css.quarter}>
              {/* Quarter Label with Payout */}
              <div className={css.about}>
                <b id={`score-${entry.quarter}`}>{entry.label}</b>
                {contest.prize_type === 'custom' && prizeText ? (
                  <small>{prizeText}</small>
                ) : payoutAmount != null ? (
                  <small>{formatPrizeAmount(payoutAmount)} payout</small>
                ) : null}
              </div>

              {/* Home and Away Score Inputs */}
              {teams.map(({ field, label }) => (
                <label key={field} className={css.team}>
                  <span>{label}</span>
                  <DashInput
                    ref={
                      entry === firstEmpty && (field === 'homeScore') === (entry.homeScore === '')
                        ? firstEmptyRef
                        : undefined
                    }
                    type='text'
                    inputMode='numeric'
                    pattern='[0-9]*'
                    placeholder='0'
                    autoComplete='off'
                    aria-label={`${entry.label}, ${label}`}
                    value={entry[field]}
                    onChange={(e) => handleScoreChange(entry.quarter, field, e.target.value)}
                    className={css.score}
                  />
                </label>
              ))}

              {/* Winner Display */}
              <p aria-live='polite' className={cn(css.winner, winner.isWinner && css.won)}>
                {winner.isWinner && <span className={css.phoneOnly}>Winner </span>}
                {winner.text}
              </p>
            </div>
          );
        })}
      </div>

      <DashDialogFoot>
        <DashButton look='quiet' onClick={onClose} disabled={isPending}>
          Cancel
        </DashButton>
        <DashButton onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Scores'}
        </DashButton>
      </DashDialogFoot>
    </DashDialog>
  );
}
