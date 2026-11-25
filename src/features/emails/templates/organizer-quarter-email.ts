import { formatPrizeAmount } from '@/features/contests/utils/prize-helpers';

import { gradientCtaButton } from '../components/email-components';
import { escapeHtml } from '../escape-html';
import { emailLayout, emailStyles } from '../layouts/email-layout';

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
    winner?.venmo && detailRow('Venmo:', winner.venmo),
    prize && detailRow('Prize:', prize, 'color: #22c55e; font-weight: bold;'),
  ].filter(Boolean);

  const problem = !winner
    ? 'Nobody claimed the winning square.'
    : !winner.email
      ? "We don't have an email for this winner, so we couldn't notify them."
      : null;

  const content = `
    ${isCorrected ? `<p style="${emailStyles.greeting}">The ${quarterName} score was corrected.</p>` : ''}
    <p style="margin: 0 0 24px 0; color: #fafafa; font-size: 20px; font-weight: 600;">${formatScore(result)}</p>
    ${problem ? `<p style="${emailStyles.greeting}">${problem}</p>` : ''}
    ${
      rows.length > 0
        ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${emailStyles.detailsBox}">
      <tr>
        <td style="${emailStyles.detailsBoxPadding}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${rows.join('')}
          </table>
        </td>
      </tr>
    </table>`
        : ''
    }
    ${gradientCtaButton('View Contest', contestUrl)}
  `;

  return { subject, html: emailLayout({ headerStyle: 'gradient', children: content }) };
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

function detailRow(label: string, value: string, valueStyle = ''): string {
  return `
            <tr>
              <td style="${emailStyles.detailRow} ${emailStyles.detailLabel} vertical-align: top;">${label}</td>
              <td style="${emailStyles.detailRow} ${emailStyles.detailValue} padding-left: 16px; word-break: break-word; ${valueStyle}">${escapeHtml(value)}</td>
            </tr>`;
}
