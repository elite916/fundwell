import { checkMark, ctaButton, emailText, paidRow, squareDetailsTable } from '../components/email-components';
import { escapeHtml } from '../escape-html';
import { emailLayout } from '../layouts/email-layout';

interface PaymentConfirmedEmailParams {
  participantName: string;
  contestName: string;
  rowTeamName: string;
  colTeamName: string;
  rowIndex: number;
  colIndex: number;
  contestUrl: string;
}

export function paymentConfirmedEmail({
  participantName,
  contestName,
  rowTeamName,
  colTeamName,
  rowIndex,
  colIndex,
  contestUrl,
}: PaymentConfirmedEmailParams): { subject: string; html: string } {
  const subject = `Payment confirmed for ${contestName}`;

  // Escape user-provided values to prevent HTML injection
  const safeParticipantName = escapeHtml(participantName);

  const content = [
    emailText(`Hi ${safeParticipantName},`),
    emailText(`Your payment has been confirmed! ${checkMark()}`, { size: 'L' }),
    squareDetailsTable({
      rowIndex,
      colIndex,
      rowTeamName,
      colTeamName,
      status: paidRow,
    }),
    emailText('Your square is locked in. Good luck!'),
    ctaButton('View Contest', contestUrl),
  ];

  const html = emailLayout({ content });

  return { subject, html };
}
