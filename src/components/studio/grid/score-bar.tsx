import { cn } from '@/utils/cn';

import css from './score-bar.module.css';

interface ScoreBarProps {
  /** "Q1", "Halftime", "Q3", "Final" */
  period: string;
  /** Halftime's longer label is set smaller, as in Figma's Q2 variant. */
  isHalftime?: boolean;
  /** Shows the live dot, while the game is on. */
  live?: boolean;
  homeTeam: string;
  homeScore: number;
  awayTeam: string;
  awayScore: number;
  className?: string;
}

/** Figma's Score bar: the period, both scores, and the winning square (the last digit of each score). */
export function ScoreBar({
  period,
  isHalftime,
  live,
  homeTeam,
  homeScore,
  awayTeam,
  awayScore,
  className,
}: ScoreBarProps) {
  return (
    <div className={cn(css.bar, className)}>
      <div className={css.teams}>
        <p className={cn(css.period, isHalftime && css.longPeriod)}>
          {live && <span aria-hidden='true' className={css.dot} />}
          {period}
        </p>
        <p className={css.home}>
          <span className={css.team}>{homeTeam}</span> <span className={css.score}>{homeScore}</span>
        </p>
        <p className={css.away}>
          <span className={css.team}>{awayTeam}</span> <span className={css.score}>{awayScore}</span>
        </p>
      </div>
      <p className={css.winning}>
        <span className={css.label}>Winning square</span>{' '}
        <span className={css.score}>
          {homeScore % 10} / {awayScore % 10}
        </span>
      </p>
    </div>
  );
}
