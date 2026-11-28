import { ctaButton, emailText } from '../components/email-components';
import { escapeHtml } from '../escape-html';
import { emailLayout } from '../layouts/email-layout';

interface OrganizerTotalsEmailParams {
  contestName: string;
  /** Supporters emailed their totals */
  supporters: number;
  /** "$420" */
  totalOwed: string;
  contestUrl: string;
}

/** To the organizer, once, after "Lock and Send Totals". Words: brain redesign-copy/hit-a-thon.md. */
export function organizerTotalsEmail({ contestName, supporters, totalOwed, contestUrl }: OrganizerTotalsEmailParams): {
  subject: string;
  html: string;
} {
  const subject = `Totals sent for ${contestName}`;

  const content = [
    emailText(
      `Fundwell emailed ${supporters} ${supporters === 1 ? 'supporter' : 'supporters'} their totals. ${escapeHtml(totalOwed)} is owed in all.`
    ),
    emailText('Mark pledges paid in your dashboard as payments come in.'),
    ctaButton('View Contest', contestUrl),
  ];

  return { subject, html: emailLayout({ content }) };
}
