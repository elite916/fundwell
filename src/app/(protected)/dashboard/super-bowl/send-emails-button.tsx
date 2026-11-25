'use client';

import { useRouter } from 'next/navigation';

import { BusyButton } from '@/components/studio/setup/busy-button';
import { sendUnsentSuperBowlEmails } from '@/features/super-bowl/actions';

import { useAction } from './use-action';

export function SendEmailsButton() {
  const router = useRouter();
  const [isPending, run] = useAction();

  return (
    <BusyButton
      busy={isPending}
      look='quiet'
      onClick={() =>
        run(
          () => sendUnsentSuperBowlEmails(),
          () => router.refresh()
        )
      }
    >
      Send Unsent Emails
    </BusyButton>
  );
}
