import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { logger } from '@/utils/logger';

import { sendEmail } from './send-email';

interface SendEmailSafeParams {
  to: string;
  template: { subject: string; html: string };
  contestId: string;
  squareId?: string;
  emailType: string;
}

export async function sendEmailSafe(params: SendEmailSafeParams): Promise<boolean> {
  try {
    const result = await sendEmail({
      to: params.to,
      subject: params.template.subject,
      html: params.template.html,
      contestId: params.contestId,
      squareId: params.squareId,
      emailType: params.emailType,
    });

    if (!result.success) {
      logger.error('sendEmailSafe', result.error, {
        emailType: params.emailType,
        contestId: params.contestId,
      });
      await logEmail(params, 'failed', null);
      return false;
    }

    await logEmail(params, 'sent', result.id ?? null);
    return true;
  } catch (error) {
    logger.error('sendEmailSafe', error, {
      emailType: params.emailType,
      contestId: params.contestId,
    });
    await logEmail(params, 'failed', null);
    return false;
  }
}

// email_logs has no insert policy, so only the service role can write to it.
// Never throws: a failed log must not change what the caller sees.
async function logEmail(params: SendEmailSafeParams, status: 'sent' | 'failed', resendId: string | null) {
  try {
    const { error } = await supabaseAdminClient.from('email_logs').insert({
      contest_id: params.contestId,
      square_id: params.squareId ?? null,
      recipient_email: params.to,
      email_type: params.emailType,
      resend_id: resendId,
      status,
    });
    if (error) throw error;
  } catch (error) {
    logger.error('logEmail', error, { emailType: params.emailType, contestId: params.contestId });
  }
}

