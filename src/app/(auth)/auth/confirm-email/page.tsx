'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/studio/button';
import { toast } from '@/components/ui/use-toast';
import { resendMagicLink } from '@/features/auth/auth-actions';
import { useTurnstile } from '@/features/auth/turnstile';

import css from '@/features/auth/auth.module.css';

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const redirectTo = searchParams.get('redirect');
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isPending, startTransition] = useTransition();
  const captcha = useTurnstile();

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  async function handleResend() {
    if (!email) return;

    startTransition(async () => {
      const response = await resendMagicLink(email, redirectTo, captcha.token);
      captcha.reset();

      if (response?.error) {
        toast({
          variant: 'destructive',
          description: response.error.message,
        });
      } else {
        toast({
          description: 'Magic link sent! Check your email.',
        });
        setCanResend(false);
        setCountdown(60);
      }
    });
  }

  return (
    <section className={css.wrap}>
      <div className={css.box}>
        <h1 className={css.title}>Check your email</h1>
        <p className={css.lead}>
          We sent a magic link to <b>{email}</b>. Click the link in the email to continue.
        </p>

        <ul className={css.list}>
          <li>The link expires in 1 hour</li>
          <li>Check your spam folder if you don&apos;t see it</li>
          <li>You can close this page after clicking the link</li>
        </ul>

        <div className={css.stack}>
          {captcha.widget}
          <Button onClick={handleResend} disabled={!canResend || isPending || !email || captcha.waiting}>
            {canResend ? 'Resend email' : `Resend email in ${countdown}s`}
          </Button>
        </div>

        <p className={css.small}>
          <Link href='/login'>Back to login</Link>
        </p>
      </div>
    </section>
  );
}
