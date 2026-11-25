import { SiteHeader } from '@/components/studio/shell/site-header';
import { getUser } from '@/features/account/controllers/get-user';

import { SignOutButton } from './sign-out-button';

/** Fundwell's header on public pages, signed in or out. */
export async function MarketingHeader() {
  const user = await getUser();
  const pricing = { href: '/pricing', label: 'Pricing' };

  if (!user) return <SiteHeader links={[pricing, { href: '/login', label: 'Log in' }]} />;

  return (
    <SiteHeader links={[pricing, { href: '/account', label: 'Account' }]}>
      <SignOutButton />
    </SiteHeader>
  );
}
