'use client';

import { Button } from '@/components/studio/button';
import { signOut } from '@/features/auth/auth-actions';

async function handleSignOut() {
  await signOut();
}

/** The header's last item when signed in: Secondary, like Log in. */
export function SignOutButton() {
  return (
    <form action={handleSignOut}>
      <Button type='submit' look='secondary'>
        Log Out
      </Button>
    </form>
  );
}
