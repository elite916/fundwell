import { escapeHtml } from '../escape-html';
import { emailStyles } from '../layouts/email-layout';

type SquareDetailsParams = {
  rowIndex: number;
  colIndex: number;
  rowTeamName: string;
  colTeamName: string;
  statusHtml?: string;
};

export function squareDetailsTable({
  rowIndex,
  colIndex,
  rowTeamName,
  colTeamName,
  statusHtml,
}: SquareDetailsParams): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="${emailStyles.detailsBox}">
      <tr>
        <td style="${emailStyles.detailsBoxPadding}">
          <p style="${emailStyles.detailsTitle}">Square Details</p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr style="${emailStyles.detailRow}">
              <td style="${emailStyles.detailLabel}">Position:</td>
              <td style="${emailStyles.detailValue}">Row ${rowIndex + 1}, Column ${colIndex + 1}</td>
            </tr>
            <tr style="${emailStyles.detailRow}">
              <td style="${emailStyles.detailLabel}">Teams:</td>
              <td style="${emailStyles.detailValue}">${escapeHtml(rowTeamName)} vs ${escapeHtml(colTeamName)}</td>
            </tr>
            ${statusHtml ? `<tr style="${emailStyles.detailRow}">${statusHtml}</tr>` : ''}
          </table>
        </td>
      </tr>
    </table>`;
}

export function ctaButton(text: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <a href="${url}" style="${emailStyles.ctaButton}">${text}</a>
        </td>
      </tr>
    </table>`;
}

export function gradientCtaButton(text: string, url: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding: 8px 0;">
          <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #F97316 0%, #FBBF24 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: 600;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}
