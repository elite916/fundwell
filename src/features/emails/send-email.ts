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
