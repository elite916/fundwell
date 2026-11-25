import { redirect } from 'next/navigation';

import { getUser } from '@/features/account/controllers/get-user';
import { signInWithEmail, signInWithOAuth } from '@/features/auth/auth-actions';
import { AuthUI } from '@/features/auth/auth-ui';

import css from '@/features/auth/auth.module.css';

export default async function SignUp({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const user = await getUser();

  if (user) {
    redirect('/dashboard');
  }

  const { redirect: redirectParam } = await searchParams;
  const redirectUrl = redirectParam && redirectParam.startsWith('/') ? redirectParam : null;

  return (
    <section className={css.wrap}>
      <AuthUI
        mode='signup'
        signInWithOAuth={signInWithOAuth}
        signInWithEmail={signInWithEmail}
        redirectUrl={redirectUrl}
      />
    </section>
  );
}
