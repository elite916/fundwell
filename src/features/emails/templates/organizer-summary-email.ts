import { brandStrong, ctaButton, emailText } from '../components/email-components';
import { escapeHtml } from '../escape-html';
import { emailColors, emailLayout, emailStack } from '../layouts/email-layout';

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
      ? `Winner: <strong style="font-weight: 700;">${escapeHtml(result.winner.name)}</strong>.`
      : 'Nobody claimed the winning square.';

    return emailText(`${formatScore(result)} ${winner}${prize ? ` Prize: ${brandStrong(escapeHtml(prize))}` : ''}`);
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
    : emailText(
        `When you've paid the winners, mark the contest complete in your dashboard.${closingDate ? ` It closes automatically on ${closingDate}.` : ''}`
      );

  // A Details box with no title, its rows the quarters, 8px apart
  const content = [
    `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${emailColors.bg}; border-radius: 4px;">
      <tr>
        <td style="padding: 16px;">${emailStack(quarterLines, 8)}
        </td>
      </tr>
    </table>`,
    closing,
    ctaButton('View Contest', contestUrl),
  ];

  return { subject, html: emailLayout({ content }) };
}
