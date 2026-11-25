import { gradientCtaButton } from '../components/email-components';
import { escapeHtml } from '../escape-html';
import { emailLayout, emailStyles } from '../layouts/email-layout';

import { formatPrize, formatScore, type QuarterResult } from './organizer-quarter-email';

interface OrganizerSummaryEmailParams {
  contestName: string;
  isCorrected: boolean;
  quarters: QuarterResult[];
  isCompleted: boolean;
  /** Null when the contest won't close by itself */
  closesAt: Date | null;
  contestUrl: string;
}

export function organizerSummaryEmail({
  contestName,
  isCorrected,
  quarters,
  isCompleted,
  closesAt,
  contestUrl,
}: OrganizerSummaryEmailParams): { subject: string; html: string } {
  const subject = isCorrected ? `Corrected: all winners in ${contestName}` : `All winners in ${contestName}`;

  const quarterLines = quarters.map((result) => {
    const prize = formatPrize(result);
    const winner = result.winner
      ? `Winner: <strong>${escapeHtml(result.winner.name)}</strong>.`
      : 'Nobody claimed the winning square.';

    return `
          <p style="margin: 0; padding: 8px 0; color: #fafafa; font-size: 14px; line-height: 1.5; word-break: break-word;">
            ${formatScore(result)} ${winner}${prize ? ` Prize: <strong style="color: #22c55e;">${escapeHtml(prize)}</strong>` : ''}
          </p>`;
  });

  // The same day for everyone, wherever the server runs
  const closingDate = closesAt?.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  });

  const closing = isCompleted
    ? ''
    : `
    <p style="${emailStyles.greeting}">
      When you've paid the winners, mark the contest complete in your dashboard.${closingDate ? ` It closes automatically on ${closingDate}.` : ''}
    </p>`;

  const content = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${emailStyles.detailsBox}">
      <tr>
        <td style="${emailStyles.detailsBoxPadding}">${quarterLines.join('')}
        </td>
      </tr>
    </table>
    ${closing}
    ${gradientCtaButton('View Contest', contestUrl)}
  `;

  return { subject, html: emailLayout({ headerStyle: 'gradient', children: content }) };
}
