import { formatPrizeAmount } from '@/features/contests/utils/prize-helpers';

import { brandStrong, ctaButton, emailText } from '../components/email-components';
import { escapeHtml } from '../escape-html';
import { emailColors, emailFonts, emailLayout, emailStack, emailStyles } from '../layouts/email-layout';

interface WinnerEmailParams {
  participantName: string;
  contestName: string;
  quarterName: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  prizeAmount: number;
  prizeText?: string | null;
  contestUrl: string;
}

export function winnerEmail({
  participantName,
  contestName,
  quarterName,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  prizeAmount,
  prizeText,
  contestUrl,
}: WinnerEmailParams): { subject: string; html: string } {
  const subject = `🏆 You won ${quarterName} in ${contestName}!`;

  // Escape user-provided values to prevent HTML injection
  const safeParticipantName = escapeHtml(participantName);
  const safeContestName = escapeHtml(contestName);
  const safeHomeTeamName = escapeHtml(homeTeamName);
  const safeAwayTeamName = escapeHtml(awayTeamName);

  // Winner heading: trophy and WINNER!, Display/L (Display/M on a phone)
  const heading = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" class="fw-display-l" style="${emailStyles.displayL} color: ${emailColors.ink}; text-align: center;">🏆</td>
      </tr>
      <tr>
        <td align="center" class="fw-display-l" style="padding-top: 8px; ${emailStyles.displayL} color: ${emailColors.ink}; text-align: center;">WINNER!</td>
      </tr>
    </table>`;

  // Final score: a paper panel with a flat scoreboard
  function scoreRow(team: string, score: number, rule: string): string {
    return `
            <tr>
              <td style="${rule} padding: 12px 16px; font-family: ${emailFonts.body}; font-size: 16px; line-height: 1.25; font-weight: 700; color: ${emailColors.ink}; ${emailStyles.wrap}">${team}</td>
              <td align="right" style="${rule} padding: 12px 16px 12px 0; ${emailStyles.displayS} color: ${emailColors.ink}; text-align: right; white-space: nowrap;">${score}</td>
            </tr>`;
  }

  const scoreBox = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${emailColors.bg}; border-radius: 4px;">
      <tr>
        <td style="padding: 16px;">
          <p class="fw-label" style="${emailStyles.label} text-align: center; margin: 0 0 12px 0;">Final Score</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${emailColors.surface}; border: 2px solid ${emailColors.ink}; border-radius: 4px; border-collapse: separate;">${scoreRow(safeHomeTeamName, homeScore, '')}${scoreRow(safeAwayTeamName, awayScore, `border-top: 1px solid ${emailColors.ink};`)}
          </table>
        </td>
      </tr>
    </table>`;

  // Custom prizes show their text; a quarter with no prize shows no prize block.
  const prizeValue = prizeText ? escapeHtml(prizeText) : prizeAmount > 0 ? formatPrizeAmount(prizeAmount) : null;
  // Prize block: styled like the winning square
  const prizeSection = prizeValue
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${emailColors.winning}; border: 2px solid ${emailColors.ink}; border-radius: 4px; border-collapse: separate;">
      <tr>
        <td align="center" style="padding: 24px 16px; text-align: center;">
          <p class="fw-label" style="${emailStyles.label} color: ${emailColors.ink}; text-align: center; margin: 0 0 8px 0;">Your Prize</p>
          <p class="fw-display-l" style="margin: 0; ${emailStyles.displayL} color: ${emailColors.ink}; text-align: center;">${prizeValue}</p>
        </td>
      </tr>
    </table>`
    : '';

  const content = [
    heading,
    emailStack(
      [
        emailText(`Congratulations ${safeParticipantName}!`, { size: 'L', align: 'center' }),
        emailText(`You won ${brandStrong(quarterName)} in ${brandStrong(safeContestName)}!`, { align: 'center' }),
      ],
      8
    ),
    scoreBox,
    prizeSection,
    ctaButton('View Contest', contestUrl),
  ];

  const html = emailLayout({ content });

  return { subject, html };
}
