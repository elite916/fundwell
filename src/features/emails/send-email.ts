import { resendClient } from '@/libs/resend/resend-client';
import { logger } from '@/utils/logger';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  contestId?: string;
  squareId?: string;
  emailType: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  contestId,
  squareId,
  emailType,
}: SendEmailParams): Promise<
  { success: true; id: string | undefined } | { success: false; error: unknown; statusCode: number | undefined }
> {
  // Set only when the API answered with an error: a network error or an unreadable answer has no code
  let statusCode: number | undefined;

  try {
    const { data, error } = await resendClient.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Fundwell <no-reply@fundwell.us>',
      to,
      subject,
      html,
    });

    if (error) {
      statusCode = (error as { statusCode?: number }).statusCode;
      // Some refusals quote an email address
      throw new Error(error.message?.replace(/[^\s(<"'`]+@[^\s)>"'`]+/g, '[email]'));
    }

    return { success: true, id: data?.id };
  } catch (error) {
    logger.error('send-email', error);
    return { success: false, error, statusCode };
  }
}

/**
 * Sends up to 100 emails in one request (Resend's batch). All or nothing: on success, the ids are in the same order
 * as the emails. `statusCode` is set only when the API answered with an error.
 */
export async function sendEmailBatch(
  emails: { to: string; subject: string; html: string }[]
): Promise<{ success: true; ids: (string | null)[] } | { success: false; statusCode: number | undefined }> {
  let statusCode: number | undefined;

  try {
    const from = process.env.RESEND_FROM_EMAIL || 'Fundwell <no-reply@fundwell.us>';
    const { data, error } = await resendClient.batch.send(emails.map((email) => ({ from, ...email })));

    if (error) {
      statusCode = (error as { statusCode?: number }).statusCode;
      // Some refusals quote an email address
      throw new Error(error.message?.replace(/[^\s(<"'`]+@[^\s)>"'`]+/g, '[email]'));
    }

    return { success: true, ids: emails.map((_, i) => data?.data?.[i]?.id ?? null) };
  } catch (error) {
    logger.error('send-email-batch', error);
    return { success: false, statusCode };
  }
}
