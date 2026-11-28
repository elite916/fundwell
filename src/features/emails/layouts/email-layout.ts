// Game day emails, from Figma's Emails page. Light, Fundwell colors only: email never takes team colors. Fluid from
// 600 down to 375: tables and inline styles do the layout, and the <style> block below only adds the phone sizes
// (where a client drops it, the email keeps the 600 sizes in a narrower card).

/** Figma variables, Fundwell mode */
export const emailColors = {
  brand: '#17603F',
  onBrand: '#FFFFFF',
  ink: '#1C1B18',
  inkMuted: '#57534A',
  bg: '#F6F2E9',
  surface: '#FFFFFF',
  rule: '#DDD6C6',
  winning: '#F2B233',
} as const;

// Gmail and Outlook don't load web fonts: they show Arial (Figma's "Gmail and Outlook (fallback font)" frames).
const body = 'Figtree, Arial, Helvetica, sans-serif';
const display = "'Big Shoulders Display', Arial, Helvetica, sans-serif";

export const emailFonts = {
  body,
  display,
  /** Figtree has no ✓: Inter (loaded for that one glyph) or the system's symbol font draws it */
  symbol: "Inter, 'Segoe UI Symbol', 'Apple Symbols', Arial, sans-serif",
} as const;

const wrap = 'overflow-wrap: break-word; word-break: break-word;';

export const emailStyles = {
  bodyM: `margin: 0; font-family: ${body}; font-size: 16px; line-height: 1.5; font-weight: 400; color: ${emailColors.ink}; ${wrap}`,
  bodyL: `margin: 0; font-family: ${body}; font-size: 20px; line-height: 1.5; font-weight: 400; color: ${emailColors.ink}; ${wrap}`,
  /** Label (600) or, with the fw-label class, Label/Phone (375) */
  label: `margin: 0; font-family: ${body}; font-size: 13px; line-height: 1.23; font-weight: 700; letter-spacing: 0.52px; text-transform: uppercase; color: ${emailColors.inkMuted}; ${wrap}`,
  displayXS: `margin: 0; font-family: ${display}; font-size: 20px; line-height: 1; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; color: ${emailColors.ink}; ${wrap}`,
  displayS: `font-family: ${display}; font-size: 32px; line-height: 1; font-weight: 800; text-transform: uppercase;`,
  /** Display/L (600) or, with the fw-display-l class, Display/M (375) */
  displayL: `font-family: ${display}; font-size: 80px; line-height: 0.92; font-weight: 900; text-transform: uppercase; ${wrap}`,
  wrap,
} as const;

// The 375 frames: tighter shell, header and card, Display/M, Label/Phone, narrower digit columns, a full-width button
const phoneStyles = `
    @media only screen and (max-width: 480px) {
      .fw-shell { padding: 24px 12px !important; }
      .fw-header { padding: 20px !important; }
      .fw-card { padding: 20px !important; }
      .fw-display-l { font-size: 52px !important; line-height: 0.96 !important; font-weight: 800 !important; }
      .fw-label { font-size: 15px !important; letter-spacing: 0.6px !important; }
      .fw-digit { width: 64px !important; }
      .fw-button { width: 100% !important; }
    }`;

/** Blocks one above the other, `gap` px apart. Empty blocks are skipped. */
export function emailStack(blocks: (string | null | false | undefined)[], gap = 24): string {
  const rows = blocks
    .filter((block): block is string => Boolean(block))
    .map((block, i) => `<tr><td style="padding: ${i === 0 ? 0 : gap}px 0 0 0;">${block}</td></tr>`)
    .join('\n');

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>`;
}

interface EmailLayoutOptions {
  /** The card's blocks, top to bottom, 24px apart */
  content: (string | null | false | undefined)[];
}

/** Figma's Email shell: paper, the green Fundwell band, a white card with the content, and the sign-off. */
export function emailLayout({ content }: EmailLayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Fundwell</title>
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&amp;family=Figtree:wght@400;700&amp;display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;text=%E2%9C%93&amp;display=swap" rel="stylesheet">
  <!--<![endif]-->
  <!--[if mso]><style>* { font-family: Arial, Helvetica, sans-serif !important; }</style><![endif]-->
  <style>${phoneStyles}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${emailColors.bg}; -webkit-text-size-adjust: 100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${emailColors.bg};">
    <tr>
      <td align="center" class="fw-shell" style="padding: 40px 20px;">
        <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" align="center"><tr><td><![endif]-->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; max-width: 560px;">
          <tr>
            <td class="fw-header" style="background-color: ${emailColors.brand}; border-radius: 4px 4px 0 0; padding: 24px 32px; ${emailStyles.displayS} color: ${emailColors.onBrand};">Fundwell</td>
          </tr>
          <tr>
            <td class="fw-card" style="background-color: ${emailColors.surface}; border: 1px solid ${emailColors.rule}; border-radius: 0 0 4px 4px; padding: 32px;">
              ${emailStack(content)}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 24px 0 0 0; ${emailStyles.bodyM} color: ${emailColors.inkMuted}; text-align: center;">- The Fundwell Team</td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}
