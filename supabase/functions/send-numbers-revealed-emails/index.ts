// @ts-nocheck - Deno Edge Function (not Node.js)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface EmailSquare {
  rowIndex: number;
  colIndex: number;
  rowNumber: number;
  colNumber: number;
}

interface NumbersRevealedEmailParams {
  participantName: string;
  contestName: string;
  rowTeamName: string;
  colTeamName: string;
  squares: EmailSquare[];
  contestUrl: string;
}

/**
 * Escapes HTML special characters to prevent XSS/HTML injection in emails.
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes a string for use in email subject lines.
 * Removes newlines, carriage returns, and control characters to prevent header injection.
 */
function sanitizeSubject(unsafe: string): string {
  return unsafe
    .replace(/[\r\n]/g, ' ') // Replace newlines with spaces to prevent header injection
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}

function generateNumbersRevealedEmail({
  participantName,
  contestName,
  rowTeamName,
  colTeamName,
  squares,
  contestUrl,
}: NumbersRevealedEmailParams): { subject: string; html: string } {
  // Escape user-provided values to prevent HTML injection
  const safeParticipantName = escapeHtml(participantName);
  const safeContestName = escapeHtml(contestName);
  const safeRowTeamName = escapeHtml(rowTeamName);
  const safeColTeamName = escapeHtml(colTeamName);

  // Sanitize contest name for subject line (prevent header injection)
  const subjectSafeContestName = sanitizeSubject(contestName);
  const subject = `Numbers are in for ${subjectSafeContestName}!`;

  // Game day look, the same as the app's emails (src/features/emails/layouts/email-layout.ts): this function can't
  // import from src, so the styles are repeated here. Figma: Emails page, "Numbers revealed".
  const brand = '#17603F';
  const ink = '#1C1B18';
  const inkMuted = '#57534A';
  const paper = '#F6F2E9';
  const rule = '#DDD6C6';
  const body = 'Figtree, Arial, Helvetica, sans-serif';
  const display = "'Big Shoulders Display', Arial, Helvetica, sans-serif";
  const wrap = 'overflow-wrap: break-word; word-break: break-word;';
  const bodyM = `margin: 0; font-family: ${body}; font-size: 16px; line-height: 1.5; font-weight: 400; color: ${ink}; ${wrap}`;
  const label = `font-family: ${body}; font-size: 13px; line-height: 1.23; font-weight: 700; letter-spacing: 0.52px; text-transform: uppercase; color: ${inkMuted}; ${wrap}`;
  // "Position" and "Row r, Column c" wrap only between words, so a narrow screen squeezes the team names instead
  const ourWords = 'overflow-wrap: normal; word-break: normal;';
  const digit = `font-family: ${display}; font-size: 32px; line-height: 1; font-weight: 800; color: ${brand};`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Fundwell</title>
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&amp;family=Figtree:wght@400;700&amp;display=swap" rel="stylesheet">
  <!--<![endif]-->
  <!--[if mso]><style>* { font-family: Arial, Helvetica, sans-serif !important; }</style><![endif]-->
  <style>
    @media only screen and (max-width: 480px) {
      .fw-shell { padding: 24px 12px !important; }
      .fw-header { padding: 20px !important; }
      .fw-card { padding: 20px !important; }
      .fw-label { font-size: 15px !important; letter-spacing: 0.6px !important; }
      .fw-digit { width: 64px !important; }
      .fw-button { width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${paper}; -webkit-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${paper};">
    <tr>
      <td align="center" class="fw-shell" style="padding: 40px 20px;">
        <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" align="center"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 560px;">

          <!-- Header -->
          <tr>
            <td class="fw-header" style="background-color: ${brand}; border-radius: 4px 4px 0 0; padding: 24px 32px; font-family: ${display}; font-size: 32px; line-height: 1; font-weight: 800; text-transform: uppercase; color: #FFFFFF;">Fundwell</td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="fw-card" style="background-color: #FFFFFF; border: 1px solid ${rule}; border-radius: 0 0 4px 4px; padding: 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- Greeting -->
                <tr>
                  <td>
                    <p style="${bodyM}">Hi ${safeParticipantName},</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 24px;">
                    <p style="${bodyM}">The numbers have been revealed for <strong style="font-weight: 700; color: ${brand};">${safeContestName}</strong>!</p>
                  </td>
                </tr>

                <!-- Square Details Box -->
                <tr>
                  <td style="padding-top: 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${paper}; border-radius: 4px;">
                      <tr>
                        <td style="padding: 16px;">
                          <p style="margin: 0 0 12px 0; font-family: ${display}; font-size: 20px; line-height: 1; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; color: ${ink};">${squares.length === 1 ? 'Your Square' : 'Your Squares'}</p>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td class="fw-label" style="padding: 8px 0; ${label} ${ourWords}">Position</td>
                              <td class="fw-label fw-digit" width="96" style="width: 96px; padding: 8px 0 8px 8px; ${label} text-align: center;">${safeRowTeamName}</td>
                              <td class="fw-label fw-digit" width="96" style="width: 96px; padding: 8px 0 8px 8px; ${label} text-align: center;">${safeColTeamName}</td>
                            </tr>
                            ${squares
                              .map(
                                (square) => `
                            <tr>
                              <td style="border-top: 1px solid ${rule}; padding: 12px 0; ${bodyM} ${ourWords}">Row ${square.rowIndex + 1}, Column ${square.colIndex + 1}</td>
                              <td class="fw-digit" width="96" style="border-top: 1px solid ${rule}; width: 96px; padding: 12px 0 12px 8px; ${digit} text-align: center;">${square.rowNumber}</td>
                              <td class="fw-digit" width="96" style="border-top: 1px solid ${rule}; width: 96px; padding: 12px 0 12px 8px; ${digit} text-align: center;">${square.colNumber}</td>
                            </tr>`
                              )
                              .join('')}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td style="padding-top: 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" class="fw-button" style="margin: 0 auto;">
                      <tr>
                        <td align="center" bgcolor="${brand}" style="background-color: ${brand}; border-radius: 4px; mso-padding-alt: 12px 24px;">
                          <a href="${contestUrl}" style="display: block; padding: 12px 24px; font-family: ${body}; font-size: 16px; line-height: 1.25; font-weight: 700; color: #FFFFFF; text-decoration: none; text-align: center; border-radius: 4px;">View Contest</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 0 0 0; ${bodyM} color: ${inkMuted}; text-align: center;">Good luck! - The Fundwell Team</td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}

/**
 * Reads the `role` claim of the bearer JWT. The signature is NOT checked here:
 * this function must run with verify_jwt = true (supabase/config.toml), so the
 * platform rejects any token with a bad signature before this code runs.
 */
function bearerRole(authHeader: string): string | null {
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '='));
    const role = JSON.parse(json).role;
    return typeof role === 'string' ? role : null;
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only the app's server (which checks contest ownership first) may call this.
  // The public anon key passes the platform's JWT check, so require the
  // service_role claim here.
  if (bearerRole(req.headers.get('Authorization') ?? '') !== 'service_role') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { contestId?: string; sendAgain?: boolean };
  try {
    body = await req.json();
  } catch (err) {
    console.error('Failed to parse JSON body:', err);
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { contestId, sendAgain } = body;

  if (!contestId) {
    return new Response(JSON.stringify({ error: 'contestId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate required environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  const missingEnvVars: string[] = [];
  if (!supabaseUrl) missingEnvVars.push('SUPABASE_URL');
  if (!supabaseServiceRoleKey) missingEnvVars.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars.join(', '));
    return new Response(
      JSON.stringify({ error: `Missing required environment variables: ${missingEnvVars.join(', ')}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

  // Fetch contest
  const { data: contest, error: contestError } = await supabase
    .from('contests')
    .select('id, name, slug, row_team_name, col_team_name, row_numbers, col_numbers')
    .eq('id', contestId)
    .is('deleted_at', null)
    .single();

  if (contestError || !contest) {
    console.log('Contest fetch error:', contestError);
    return new Response(JSON.stringify({ error: 'Contest not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!contest.row_numbers || !contest.col_numbers) {
    console.log('Numbers not set for contest:', contestId);
    return new Response(JSON.stringify({ error: 'Numbers not set for this contest' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch squares with participants. Emails live in the owner-only
  // square_claimants table; the inner join keeps only squares that have one.
  const { data: squareRows, error: squaresError } = await supabase
    .from('squares')
    .select('id, row_index, col_index, claimant_first_name, payment_status, square_claimants!inner(email)')
    .eq('contest_id', contestId)
    .in('payment_status', ['pending', 'paid']);

  const squares = squareRows?.map((row) => {
    const claimant = Array.isArray(row.square_claimants) ? row.square_claimants[0] : row.square_claimants;
    return { ...row, claimant_email: claimant?.email as string };
  });

  if (squaresError) {
    console.log('Squares fetch error:', squaresError);
    return new Response(JSON.stringify({ error: 'Failed to fetch squares' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!squares || squares.length === 0) {
    console.log('No squares with participants found for contest:', contestId);
    return new Response(JSON.stringify({ success: true, sent: 0, failed: 0, message: 'No participants to notify' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured');
    return new Response(JSON.stringify({ error: 'Email service not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const baseUrl = Deno.env.get('SITE_URL') || 'https://fundwell.us';
  const contestUrl = `${baseUrl}/contest/${encodeURIComponent(contest.slug)}`;

  // One send at a time per contest, so a double-click can't send twice.
  const { data: gotLock, error: lockError } = await supabase.rpc('take_numbers_email_lock', {
    p_contest_id: contestId,
  });

  if (lockError) {
    console.log('Lock error:', lockError);
    return new Response(JSON.stringify({ error: 'Failed to lock contest for sending' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!gotLock) {
    console.log('Numbers emails already sending for contest:', contestId);
    return new Response(JSON.stringify({ error: 'Numbers emails are already being sent' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Numbers go out once per person. Later changes re-send only when the owner asks.
    const alreadySent = new Set<string>();
    if (sendAgain !== true) {
      const { data: sentRows, error: logsError } = await supabase
        .from('email_logs')
        .select('recipient_email')
        .eq('contest_id', contestId)
        .eq('email_type', 'numbers_revealed')
        .eq('status', 'sent');

      if (logsError) {
        console.log('Email logs fetch error:', logsError);
        return new Response(JSON.stringify({ error: 'Failed to check sent emails' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      for (const row of sentRows ?? []) alreadySent.add(row.recipient_email.trim().toLowerCase());
    }

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    // One email per person: group squares by email, ignoring case.
    const people = new Map<string, { email: string; name: string; squares: EmailSquare[] }>();
    const rowNumbers = contest.row_numbers as number[];
    const colNumbers = contest.col_numbers as number[];

    for (const square of squares) {
      // Validate array indices before accessing
      const rowIndex = square.row_index;
      const colIndex = square.col_index;

      if (rowIndex < 0 || rowIndex >= rowNumbers.length || colIndex < 0 || colIndex >= colNumbers.length) {
        console.warn(
          `Skipping square with invalid indices: square_id=${square.id}, row_index=${rowIndex}, col_index=${colIndex}, ` +
            `row_numbers.length=${rowNumbers.length}, col_numbers.length=${colNumbers.length}`
        );
        failCount++;
        continue;
      }

      const rowNumber = rowNumbers[rowIndex];
      const colNumber = colNumbers[colIndex];

      // Extra safety check for undefined values (shouldn't happen after bounds check)
      if (rowNumber === undefined || colNumber === undefined) {
        console.warn(
          `Skipping square with undefined numbers: square_id=${square.id}, row_index=${rowIndex}, col_index=${colIndex}, ` +
            `rowNumber=${rowNumber}, colNumber=${colNumber}`
        );
        failCount++;
        continue;
      }

      const key = square.claimant_email.trim().toLowerCase();
      if (alreadySent.has(key)) {
        skippedCount++;
        continue;
      }
      let person = people.get(key);
      if (!person) {
        person = { email: square.claimant_email.trim(), name: square.claimant_first_name || 'Participant', squares: [] };
        people.set(key, person);
      }
      person.squares.push({ rowIndex, colIndex, rowNumber, colNumber });
    }

    let personIndex = 0;
    for (const person of people.values()) {
      personIndex++;
      person.squares.sort((a, b) => a.rowIndex - b.rowIndex || a.colIndex - b.colIndex);

      const { subject, html } = generateNumbersRevealedEmail({
        participantName: person.name,
        contestName: contest.name,
        rowTeamName: contest.row_team_name,
        colTeamName: contest.col_team_name,
        squares: person.squares,
        contestUrl,
      });

      let sent = false;
      let resendId: string | null = null;
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: Deno.env.get('RESEND_FROM_EMAIL') || 'Fundwell <no-reply@fundwell.us>',
            to: person.email,
            subject,
            html,
          }),
        });

        if (response.ok) {
          sent = true;
          successCount++;
          resendId = (await response.json().catch(() => null))?.id ?? null;
          console.log(`Email sent successfully for person ${personIndex} (${person.squares.length} squares)`);
        } else {
          failCount++;
          const errorData = await response.text();
          console.log(`Failed to send email for person ${personIndex}:`, errorData);
        }
      } catch (error) {
        failCount++;
        console.log(`Error sending email for person ${personIndex}:`, error);
      }

      const { error: logError } = await supabase.from('email_logs').insert({
        contest_id: contestId,
        recipient_email: person.email,
        email_type: 'numbers_revealed',
        resend_id: resendId,
        status: sent ? 'sent' : 'failed',
      });
      if (logError) {
        console.log(`Failed to log email for person ${personIndex}:`, logError);
      }
    }

    console.log(
      `Numbers revealed emails complete. Sent: ${successCount}, Failed: ${failCount}, Already sent (squares): ${skippedCount}`
    );

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount, skipped: skippedCount }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    const { error: unlockError } = await supabase.from('numbers_email_locks').delete().eq('contest_id', contestId);
    if (unlockError) {
      console.log('Unlock error:', unlockError);
    }
  }
});
