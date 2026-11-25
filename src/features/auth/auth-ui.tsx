'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { IoLogoGoogle } from 'react-icons/io5';
import { z } from 'zod';

import { Button } from '@/components/studio/button';
import { TextField } from '@/components/studio/text-field';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ActionResponse } from '@/types/action-response';
import { zodResolver } from '@hookform/resolvers/zod';

import css from './auth.module.css';

const titleMap = {
  login: 'Login to Fundwell',
  signup: 'Join Fundwell and start hosting your game day fundraiser',
} as const;

const emailFormSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
});

type EmailFormData = z.infer<typeof emailFormSchema>;

export function AuthUI({
  mode,
  signInWithOAuth,
  signInWithEmail,
  redirectUrl,
}: {
  mode: 'login' | 'signup';
  signInWithOAuth: (provider: 'google', redirectUrl?: string | null) => Promise<ActionResponse>;
  signInWithEmail: (email: string, redirectTo?: string | null) => Promise<ActionResponse<{ email: string }>>;
  redirectUrl?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [emailFormOpen, setEmailFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: '',
    },
  });

  function handleEmailFormOpenChange(open: boolean) {
    setEmailFormOpen(open);
  }

  async function onSubmit(data: EmailFormData) {
    setError(null);
    setPending(true);

    const response = await signInWithEmail(data.email, redirectUrl);

    if (response?.error) {
      setError(response.error.message);
      reset();
      setPending(false);
    } else {
      // Include redirect in confirm-email URL so resend can use it
      const confirmUrl = redirectUrl
        ? `/auth/confirm-email?email=${encodeURIComponent(data.email)}&redirect=${encodeURIComponent(redirectUrl)}`
        : `/auth/confirm-email?email=${encodeURIComponent(data.email)}`;
      router.push(confirmUrl);
    }
  }

  async function handleOAuthClick(provider: 'google') {
    setError(null);
    setPending(true);
    const response = await signInWithOAuth(provider, redirectUrl);

    if (response?.error) {
      setError(response.error.message);
      setPending(false);
    }
  }

  return (
    <div className={css.box}>
      <h1 className={css.title}>{titleMap[mode]}</h1>

      <div role='alert'>{error && <p className={css.error}>{error}</p>}</div>

      <div className={css.stack}>
        <Button onClick={() => handleOAuthClick('google')} disabled={pending}>
          <IoLogoGoogle size={20} aria-hidden='true' />
          Continue with Google
        </Button>

        <Collapsible open={emailFormOpen} onOpenChange={handleEmailFormOpenChange} className={css.stack}>
          <CollapsibleTrigger asChild>
            <Button className={css.second} disabled={pending}>
              Continue with Email
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <form onSubmit={handleSubmit(onSubmit)} className={css.form}>
              <TextField
                id='email'
                type='email'
                label='Email address'
                placeholder='Enter your email'
                autoFocus
                error={errors.email?.message}
                {...register('email')}
              />
              <div className={css.formButtons}>
                <Button look='link' onClick={() => handleEmailFormOpenChange(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button type='submit' disabled={pending}>
                  Submit
                </Button>
              </div>
            </form>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {mode === 'signup' && (
        <>
          <p className={css.small}>
            By clicking continue, you agree to our <Link href='/terms'>Terms of Service</Link> and{' '}
            <Link href='/privacy'>Privacy Policy</Link>.
          </p>
          <p className={css.small}>
            Already have an account? <Link href='/login'>Log in</Link>
          </p>
        </>
      )}
      {mode === 'login' && (
        <p className={css.small}>
          Don&apos;t have an account? <Link href='/signup'>Sign up</Link>
        </p>
      )}
    </div>
  );
}
