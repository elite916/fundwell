'use client';

import { signOut } from '@/features/auth/auth-actions';

async function handleSignOut() {
  await signOut();
}

export function SignOutButton() {
  return (
    <form action={handleSignOut}>
      <button type='submit'>Log Out</button>
    </form>
  );
}
