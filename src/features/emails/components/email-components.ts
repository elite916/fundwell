import { PAYMENT_OPTION_NAMES } from '@/features/contests/constants';

import { escapeHtml } from '../escape-html';
import { emailColors, emailFonts, emailStyles } from '../layouts/email-layout';

// Figma's email components (Components page, "Emails" section). Every value passed in as HTML is already escaped.

interface EmailTextOptions {
  /** M: Body/M 16. L: Body/L 20. */
  size?: 'M' | 'L';
  align?: 'left' | 'center';
}

/** Email text: a greeting or paragraph. */
export function emailText(html: string, { size = 'M', align = 'left' }: EmailTextOptions = {}): string {
  return `<p style="${size === 'L' ? emailStyles.bodyL : emailStyles.bodyM} text-align: ${align};">${html}</p>`;
}

/** A contest name (or quarter) in a sentence: Figtree Bold, brand. */
export function brandStrong(html: string): string {
  return `<strong style="font-weight: 700; color: ${emailColors.brand};">${html}</strong>`;
}

/** ✓ in a font that has it */
export function checkMark(): string {
  return `<span style="font-family: ${emailFonts.symbol}; line-height: 1;">✓</span>`;
}

export interface DetailRow {
  label: string;
  /** HTML */
  value: string;
  /** Amount due and Paid: bold, brand */
  look?: 'normal' | 'due' | 'paid';
}

/** Details row Value=Paid */
export const paidRow: DetailRow = { label: 'Status:', value: `${checkMark()} Paid`, look: 'paid' };

/** Details box: a paper panel, an optional title, and rows with a rule on top (none above the first when untitled). */
export function detailsBox(title: string | null, rows: DetailRow[]): string {
  const rowsHtml = rows
    .map(({ label, value, look = 'normal' }, i) => {
      const rule = i === 0 && !title ? '' : `border-top: 1px solid ${emailColors.rule};`;
      const valueStyle = look === 'normal' ? '' : `font-weight: 700; color: ${emailColors.brand};`;
      return `
            <tr>
              <td style="${rule} padding: 12px 16px 12px 0; ${emailStyles.bodyM} color: ${emailColors.inkMuted}; white-space: nowrap; vertical-align: top; width: 1%;">${label}</td>
              <td style="${rule} padding: 12px 0; ${emailStyles.bodyM} text-align: right; vertical-align: top; ${valueStyle}">${value}</td>
            </tr>`;
    })
    .join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${emailColors.bg}; border-radius: 4px;">
      <tr>
        <td style="padding: 16px;">
          ${title ? `<p style="${emailStyles.displayXS} margin: 0 0 12px 0;">${title}</p>` : ''}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rowsHtml}
          </table>
        </td>
      </tr>
    </table>`;
}

type SquareDetailsParams = {
  rowIndex: number;
  colIndex: number;
  rowTeamName: string;
  colTeamName: string;
  status: DetailRow;
};

/** The squares emails' "Square Details" box. */
export function squareDetailsTable({
  rowIndex,
  colIndex,
  rowTeamName,
  colTeamName,
  status,
}: SquareDetailsParams): string {
  return detailsBox('Square Details', [
    { label: 'Position:', value: `Row ${rowIndex + 1}, Column ${colIndex + 1}` },
    { label: 'Teams:', value: `${escapeHtml(rowTeamName)} vs ${escapeHtml(colTeamName)}` },
    status,
  ]);
}

export interface EmailPaymentOption {
  type: string;
  handle: string;
  link?: string;
}

/** The app's name ("Venmo"), or the stored type if it's one we don't know. Escaped. */
function paymentOptionName(type: string): string {
  return Object.hasOwn(PAYMENT_OPTION_NAMES, type)
    ? PAYMENT_OPTION_NAMES[type as keyof typeof PAYMENT_OPTION_NAMES]
    : escapeHtml(type);
}

/** Payment list: the heading and each way to pay. Handles are plain text unless the organizer gave a link. */
export function paymentList(paymentOptions: EmailPaymentOption[]): string {
  if (paymentOptions.length === 0) return '';

  const items = paymentOptions
    .map((option, i) => {
      const handle = escapeHtml(option.handle);
      const link = option.link && escapeHtml(option.link);
      return `
          <tr>
            <td style="padding: ${i === 0 ? 0 : 8}px 0 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 4px 0; border-bottom: 1px solid ${emailColors.rule};">
                    <p style="${emailStyles.bodyM} font-weight: 700; line-height: 1.25;">${paymentOptionName(option.type)}</p>
                    <p style="${emailStyles.bodyM} color: ${emailColors.inkMuted};">${
                      link
                        ? `<a href="${link}" style="color: ${emailColors.brand}; text-decoration: underline;">${handle}</a>`
                        : handle
                    }</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
    })
    .join('');

  return `
    <p style="${emailStyles.bodyM} font-weight: 700; line-height: 1.25; margin: 0 0 8px 0;">Complete your payment using one of these options:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${items}
    </table>`;
}

/** Button, Primary: centered, full width on a phone. */
export function ctaButton(text: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" class="fw-button" style="margin: 0 auto;">
      <tr>
        <td align="center" bgcolor="${emailColors.brand}" style="background-color: ${emailColors.brand}; border-radius: 4px; mso-padding-alt: 12px 24px;">
          <a href="${url}" style="display: block; padding: 12px 24px; font-family: ${emailFonts.body}; font-size: 16px; line-height: 1.25; font-weight: 700; color: ${emailColors.onBrand}; text-decoration: none; text-align: center; border-radius: 4px;">${text}</a>
        </td>
      </tr>
    </table>`;
}
