import { brandStrong, ctaButton, emailText, paymentList, squareDetailsTable } from '../components/email-components';
import { escapeHtml } from '../escape-html';
import { emailLayout } from '../layouts/email-layout';

interface PaymentOption {
  type: string;
  handle: string;
  link?: string;
}

interface SquareClaimedEmailParams {
  participantName: string;
  contestName: string;
  rowTeamName: string;
  colTeamName: string;
  rowIndex: number;
  colIndex: number;
  squarePrice: number;
  contestUrl: string;
  paymentOptions: PaymentOption[];
}

export function squareClaimedEmail({
  participantName,
  contestName,
  rowTeamName,
  colTeamName,
  rowIndex,
  colIndex,
  squarePrice,
  contestUrl,
  paymentOptions,
}: SquareClaimedEmailParams): { subject: string; html: string } {
  const subject = `You claimed a square in ${contestName}!`;

  // Escape user-provided values to prevent HTML injection
  const safeParticipantName = escapeHtml(participantName);
  const safeContestName = escapeHtml(contestName);

  const content = [
    emailText(`Hi ${safeParticipantName},`),
    emailText(`You've claimed a square in ${brandStrong(safeContestName)}!`),
    squareDetailsTable({
      rowIndex,
      colIndex,
      rowTeamName,
      colTeamName,
      status: { label: 'Amount Due:', value: `$${squarePrice.toFixed(2)}`, look: 'due' },
    }),
    paymentList(paymentOptions),
    ctaButton('View Contest', contestUrl),
  ];

  const html = emailLayout({ content });

  return { subject, html };
}
