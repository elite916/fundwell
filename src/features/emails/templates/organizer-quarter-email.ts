import { PAYMENT_OPTION_NAMES } from '@/features/contests/constants';
import { formatPrizeAmount } from '@/features/contests/utils/prize-helpers';

import { ctaButton, type DetailRow, detailsBox, emailText } from '../components/email-components';
import { escapeHtml } from '../escape-html';
import { emailLayout } from '../layouts/email-layout';

export interface QuarterResult {
  quarterName: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  /** Null when nobody claimed the winning square */
  winner: { name: string; email: string | null; venmo: string | null } | null;
  prizeAmount: number;
  prizeText?: string | null;
}

interface OrganizerQuarterEmailParams extends QuarterResult {
  contestName: string;
  isCorrected: boolean;
  contestUrl: string;
}

export function organizerQuarterEmail({
  contestName,
  isCorrected,
  contestUrl,
  ...result
}: OrganizerQuarterEmailParams): { subject: string; html: string } {
  const { quarterName, winner } = result;
  const winnerInQuarter = `${quarterName} winner in ${contestName}`;
  const subject = isCorrected ? `Corrected: ${winnerInQuarter}` : winnerInQuarter;

  const prize = formatPrize(result);
  const rows = [
    winner && detailRow('Winner:', winner.name),
    winner?.email && detailRow('Email:', winner.email),
    winner?.venmo && detailRow(`${PAYMENT_OPTION_NAMES.venmo}:`, winner.venmo),
    prize && detailRow('Prize:', prize, 'due'),
  ].filter((row): row is DetailRow => Boolean(row));

  const problem = !winner
    ? 'Nobody claimed the winning square.'
    : !winner.email
      ? "We don't have an email for this winner, so we couldn't notify them."
      : null;

  const content = [
    isCorrected && emailText(`The ${quarterName} score was corrected.`),
    emailText(formatScore(result), { size: 'L' }),
    problem && emailText(problem),
    rows.length > 0 && detailsBox(null, rows),
    ctaButton('View Contest', contestUrl),
  ];

  return { subject, html: emailLayout({ content }) };
}

/** Escaped for HTML. */
export function formatScore({
  quarterName,
  homeTeamName,
  homeScore,
  awayTeamName,
  awayScore,
}: Omit<QuarterResult, 'winner'>): string {
  return `${quarterName} score: ${escapeHtml(homeTeamName)} ${homeScore}, ${escapeHtml(awayTeamName)} ${awayScore}.`;
}

/** Custom prizes show their text; a quarter with no prize shows none. Not escaped. */
export function formatPrize({
  prizeText,
  prizeAmount,
}: Pick<QuarterResult, 'prizeText' | 'prizeAmount'>): string | null {
  return prizeText || (prizeAmount > 0 ? formatPrizeAmount(prizeAmount) : null);
}

function detailRow(label: string, value: string, look?: DetailRow['look']): DetailRow {
  return { label, value: escapeHtml(value), look };
}
