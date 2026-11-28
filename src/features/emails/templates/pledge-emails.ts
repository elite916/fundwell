import {
  checkMark,
  ctaButton,
  type DetailRow,
  detailsBox,
  emailText,
  paidRow,
  paymentList,
} from '../components/email-components';
import { escapeHtml } from '../escape-html';
import { emailLayout } from '../layouts/email-layout';
import { noBreakHitAThon } from '../no-break-hit-a-thon';

// The hit-a-thon supporter emails. Words: brain redesign-copy/hit-a-thon.md, "Emails to supporters".

export interface PledgePaymentOption {
  type: string;
  handle: string;
  link?: string;
}

interface PledgeEmailBase {
  firstName: string;
  contestName: string;
  playerName: string;
  playerNumber: number | null;
  /** "$5 a hit, up to $40" · "$5 a hit" · "$50" */
  pledgeText: string;
  /** The player's page */
  fundraiserUrl: string;
}

type EmailContent = { subject: string; html: string };

const row = (label: string, value: string): DetailRow => ({ label, value });

const due = (label: string, value: string): DetailRow => ({ label, value, look: 'due' });

const playerLabel = (name: string, number: number | null) => escapeHtml(number !== null ? `${name} #${number}` : name);

const line = (text: string) => emailText(text);

/** "You pledged for Sam in {contest}", per hit (the most they'd pay) or flat (the amount due and how to pay). */
export function pledgeReceivedEmail(
  params: PledgeEmailBase &
    (
      | { kind: 'per_hit'; mostYoudPay: string }
      | { kind: 'flat'; amountDue: string; paymentOptions: PledgePaymentOption[] }
    )
): EmailContent {
  const { firstName, playerName, playerNumber, pledgeText, fundraiserUrl } = params;
  const contestName = noBreakHitAThon(params.contestName);
  const subject = `You pledged for ${playerName} in ${params.contestName}`;

  const rows = [row('Player:', playerLabel(playerName, playerNumber)), row('Pledge:', escapeHtml(pledgeText))];
  const rest =
    params.kind === 'per_hit'
      ? [
          detailsBox('Pledge Details', [...rows, row('Most you&#39;d pay:', escapeHtml(params.mostYoudPay))]),
          line('After the event, we&#39;ll email your total and how to pay the organizer.'),
        ]
      : [
          detailsBox('Pledge Details', [...rows, due('Amount Due:', escapeHtml(params.amountDue))]),
          paymentList(params.paymentOptions),
          line('Pending until the organizer marks it paid. You can also pay after the event.'),
        ];

  const content = [
    line(`Hi ${escapeHtml(firstName)},`),
    line(`Thanks for pledging for ${escapeHtml(playerName)} in ${escapeHtml(contestName)}.`),
    ...rest,
    ctaButton('View Fundraiser', fundraiserUrl),
  ];

  return { subject, html: emailLayout({ content }) };
}

/**
 * The total at "Lock and Send Totals", and the organizer's reminder (the same email with a first line and its own
 * subject). Not for 0 hits: that's `pledgeZeroHitsEmail`.
 */
export function pledgeTotalEmail(
  params: PledgeEmailBase & {
    kind: 'per_hit' | 'flat';
    hits: number;
    amountDue: string;
    paymentOptions: PledgePaymentOption[];
    isReminder: boolean;
  }
): EmailContent {
  const { firstName, playerName, pledgeText, fundraiserUrl, kind, hits, amountDue, isReminder } = params;
  const contestName = noBreakHitAThon(params.contestName);
  const subject = isReminder
    ? `Reminder: your total for ${playerName} in ${params.contestName}`
    : `Your total for ${playerName} in ${params.contestName}`;

  const name = escapeHtml(playerName);
  const rows =
    kind === 'per_hit'
      ? [row('Pledge:', escapeHtml(pledgeText)), row('Hits:', String(hits)), due('Amount Due:', escapeHtml(amountDue))]
      : [row('Pledge:', escapeHtml(pledgeText)), due('Amount Due:', escapeHtml(amountDue))];

  const content = [
    line(`Hi ${escapeHtml(firstName)},`),
    isReminder && line(`A reminder: you still owe ${escapeHtml(amountDue)} for your pledge to ${name}.`),
    line(`${name} got ${hits} ${hits === 1 ? 'hit' : 'hits'} in ${escapeHtml(contestName)}.`),
    detailsBox(null, rows),
    paymentList(params.paymentOptions),
    line(`Thank you for supporting ${name}!`),
    ctaButton('View Fundraiser', fundraiserUrl),
  ];

  return { subject, html: emailLayout({ content }) };
}

/** The total email when the player got no hits: nothing owed, no payment list. */
export function pledgeZeroHitsEmail({
  firstName,
  contestName: rawContestName,
  playerName,
  fundraiserUrl,
}: PledgeEmailBase): EmailContent {
  const contestName = noBreakHitAThon(rawContestName);
  const subject = `Your total for ${playerName} in ${rawContestName}`;
  const name = escapeHtml(playerName);

  const content = [
    line(`Hi ${escapeHtml(firstName)},`),
    line(`${name} didn&#39;t get a hit this time, so you don&#39;t owe anything. Thank you for supporting ${name}!`),
    ctaButton('View Fundraiser', fundraiserUrl),
  ];

  return { subject, html: emailLayout({ content }) };
}

/** "Payment confirmed", as the squares one, with the pledge in place of the square. */
export function pledgePaidEmail({
  firstName,
  playerName,
  playerNumber,
  pledgeText,
  fundraiserUrl,
  contestName: rawContestName,
}: PledgeEmailBase): EmailContent {
  const contestName = noBreakHitAThon(rawContestName);
  const subject = `Payment confirmed for ${rawContestName}`;

  const content = [
    line(`Hi ${escapeHtml(firstName)},`),
    emailText(`Your payment has been confirmed! ${checkMark()}`, { size: 'L' }),
    detailsBox('Pledge Details', [
      row('Player:', playerLabel(playerName, playerNumber)),
      row('Pledge:', escapeHtml(pledgeText)),
      paidRow,
    ]),
    line(`Thank you for supporting ${escapeHtml(playerName)}!`),
    ctaButton('View Fundraiser', fundraiserUrl),
  ];

  return { subject, html: emailLayout({ content }) };
}
