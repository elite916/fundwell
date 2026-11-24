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

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #18181B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #18181B;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #F97316; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Fundwell</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="background-color: #27272A; padding: 32px; border-radius: 0 0 8px 8px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 16px 0; color: #fafafa; font-size: 16px;">
                Hi ${safeParticipantName},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #fafafa; font-size: 16px;">
                The numbers have been revealed for <strong style="color: #F97316;">${safeContestName}</strong>!
              </p>
              
              <!-- Square Details Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #3f3f46; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 16px 0; color: #fafafa; font-size: 18px; font-weight: 600;">
                      ${squares.length === 1 ? 'Your Square' : 'Your Squares'}
                    </h2>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 12px; text-transform: uppercase;">Position</td>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 12px; text-transform: uppercase; text-align: center;">
                          ${safeRowTeamName}
                        </td>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 12px; text-transform: uppercase; text-align: center;">
                          ${safeColTeamName}
                        </td>
                      </tr>
                      ${squares
                        .map(
                          (square) => `
                      <tr>
                        <td style="padding: 8px 0; color: #fafafa; font-size: 14px;">
                          Row ${square.rowIndex}, Column ${square.colIndex}
                        </td>
                        <td style="padding: 8px 0; color: #F97316; font-size: 24px; font-weight: bold; text-align: center;">
                          ${square.rowNumber}
                        </td>
                        <td style="padding: 8px 0; color: #F97316; font-size: 24px; font-weight: bold; text-align: center;">
                          ${square.colNumber}
                        </td>
                      </tr>`
                        )
                        .join('')}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <a href="${contestUrl}" style="display: inline-block; background-color: #F97316; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      View Contest
                    </a>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 14px;">
                Good luck! - The Fundwell Team
              </p>
            </td>
          </tr>
          
        </table>
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

  // Numbers go out once. Later changes re-send only when the owner asks.
  if (sendAgain !== true) {
    const { count: sentBefore, error: logsError } = await supabase
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
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

    if (sentBefore) {
      console.log('Numbers already emailed for contest:', contestId);
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, skipped: true, message: 'Numbers already emailed' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
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

  let successCount = 0;
  let failCount = 0;

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

  console.log(`Numbers revealed emails complete. Sent: ${successCount}, Failed: ${failCount}`);

  return new Response(JSON.stringify({ success: true, sent: successCount, failed: failCount }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
