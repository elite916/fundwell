import { ctaButton } from '../components/email-components';
import { escapeHtml } from '../escape-html';
import { emailLayout, emailStyles } from '../layouts/email-layout';

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

const row = (label: string, value: string, valueStyle: string = emailStyles.detailValue) => `
            <tr style="${emailStyles.detailRow}">
              <td style="${emailStyles.detailLabel}">${label}</td>
              <td style="${valueStyle}">${value}</td>
            </tr>`;

const dueStyle = 'color: #F97316; font-size: 16px; font-weight: bold; text-align: right;';
const paidStyle = 'color: #22c55e; font-size: 16px; font-weight: bold; text-align: right;';

function detailsBox(title: string | null, rows: string[]): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="${emailStyles.detailsBox}">
      <tr>
        <td style="${emailStyles.detailsBoxPadding}">
          ${title ? `<p style="${emailStyles.detailsTitle}">${title}</p>` : ''}
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows.join('')}
          </table>
        </td>
      </tr>
    </table>`;
}

/** Same list as the squares claim email. */
function paymentSection(paymentOptions: PledgePaymentOption[]): string {
  if (paymentOptions.length === 0) return '';

  const items = paymentOptions
    .map((option) => {
      const type = escapeHtml(option.type);
      const handle = escapeHtml(option.handle);
      const link = option.link && escapeHtml(option.link);
      return `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46;">
          <strong style="color: #fafafa;">${type}:</strong>
          ${
            link
              ? `<a href="${link}" style="color: #F97316; text-decoration: none; margin-left: 8px;">${handle}</a>`
              : `<span style="color: #a1a1aa; margin-left: 8px;">${handle}</span>`
          }
        </td>
      </tr>`;
    })
    .join('');

  return `
        <h3 style="margin: 0 0 16px 0; color: #fafafa; font-size: 16px; font-weight: 600;">
          Complete your payment using one of these options:
        </h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          ${items}
        </table>`;
}

const playerLabel = (name: string, number: number | null) => escapeHtml(number !== null ? `${name} #${number}` : name);

const line = (text: string) => `<p style="${emailStyles.greeting}">${text}</p>`;

/** "You pledged for Sam in {contest}", per hit (the most they'd pay) or flat (the amount due and how to pay). */
export function pledgeReceivedEmail(
  params: PledgeEmailBase &
    (
      | { kind: 'per_hit'; mostYoudPay: string }
      | { kind: 'flat'; amountDue: string; paymentOptions: PledgePaymentOption[] }
    )
): EmailContent {
  const { firstName, contestName, playerName, playerNumber, pledgeText, fundraiserUrl } = params;
  const subject = `You pledged for ${playerName} in ${contestName}`;

  const rows = [row('Player:', playerLabel(playerName, playerNumber)), row('Pledge:', escapeHtml(pledgeText))];
  const rest =
    params.kind === 'per_hit'
      ? `${detailsBox('Pledge Details', [...rows, row('Most you&#39;d pay:', escapeHtml(params.mostYoudPay))])}
    ${line('After the event, we&#39;ll email your total and how to pay the organizer.')}`
      : `${detailsBox('Pledge Details', [...rows, row('Amount Due:', escapeHtml(params.amountDue), dueStyle)])}
    ${paymentSection(params.paymentOptions)}
    ${line('Pending until the organizer marks it paid. You can also pay after the event.')}`;

  const content = `
    ${line(`Hi ${escapeHtml(firstName)},`)}
    ${line(`Thanks for pledging for ${escapeHtml(playerName)} in ${escapeHtml(contestName)}.`)}
    ${rest}
    ${ctaButton('View Fundraiser', fundraiserUrl)}
  `;

  return { subject, html: emailLayout({ children: content }) };
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
  const { firstName, contestName, playerName, pledgeText, fundraiserUrl, kind, hits, amountDue, isReminder } = params;
  const subject = isReminder
    ? `Reminder: your total for ${playerName} in ${contestName}`
    : `Your total for ${playerName} in ${contestName}`;

  const name = escapeHtml(playerName);
  const rows =
    kind === 'per_hit'
      ? [
          row('Pledge:', escapeHtml(pledgeText)),
          row('Hits:', String(hits)),
          row('Amount Due:', escapeHtml(amountDue), dueStyle),
        ]
      : [row('Pledge:', escapeHtml(pledgeText)), row('Amount Due:', escapeHtml(amountDue), dueStyle)];

  const content = `
    ${line(`Hi ${escapeHtml(firstName)},`)}
    ${isReminder ? line(`A reminder: you still owe ${escapeHtml(amountDue)} for your pledge to ${name}.`) : ''}
    ${line(`${name} got ${hits} ${hits === 1 ? 'hit' : 'hits'} in ${escapeHtml(contestName)}.`)}
    ${detailsBox(null, rows)}
    ${paymentSection(params.paymentOptions)}
    ${line(`Thank you for supporting ${name}!`)}
    ${ctaButton('View Fundraiser', fundraiserUrl)}
  `;

  return { subject, html: emailLayout({ children: content }) };
}

/** The total email when the player got no hits: nothing owed, no payment list. */
export function pledgeZeroHitsEmail({
  firstName,
  contestName,
  playerName,
  fundraiserUrl,
}: PledgeEmailBase): EmailContent {
  const subject = `Your total for ${playerName} in ${contestName}`;
  const name = escapeHtml(playerName);

  const content = `
    ${line(`Hi ${escapeHtml(firstName)},`)}
    ${line(`${name} didn&#39;t get a hit this time, so you don&#39;t owe anything. Thank you for supporting ${name}!`)}
    ${ctaButton('View Fundraiser', fundraiserUrl)}
  `;

  return { subject, html: emailLayout({ children: content }) };
}

/** "Payment confirmed", as the squares one, with the pledge in place of the square. */
export function pledgePaidEmail({
  firstName,
  contestName,
  playerName,
  playerNumber,
  pledgeText,
  fundraiserUrl,
}: PledgeEmailBase): EmailContent {
  const subject = `Payment confirmed for ${contestName}`;

  const content = `
    ${line(`Hi ${escapeHtml(firstName)},`)}
    <p style="margin: 0 0 24px 0; color: #fafafa; font-size: 18px; font-weight: 600;">
      Your payment has been confirmed! ✓
    </p>
    ${detailsBox('Pledge Details', [
      row('Player:', playerLabel(playerName, playerNumber)),
      row('Pledge:', escapeHtml(pledgeText)),
      row('Status:', '✓ Paid', paidStyle),
    ])}
    ${line(`Thank you for supporting ${escapeHtml(playerName)}!`)}
    ${ctaButton('View Fundraiser', fundraiserUrl)}
  `;

  return { subject, html: emailLayout({ children: content }) };
}
