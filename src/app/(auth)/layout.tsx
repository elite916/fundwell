import { PropsWithChildren } from 'react';

import { SiteHeader } from '@/components/studio/shell/site-header';
import { StudioPage } from '@/components/studio/shell/studio-page';
import { getUser } from '@/features/account/controllers/get-user';

export default async function AuthLayout({ children }: PropsWithChildren) {
  const user = await getUser();

  return (
    <StudioPage
      header={
        <SiteHeader
          links={[
            { href: '/pricing', label: 'Pricing' },
            user ? { href: '/account', label: 'Account' } : { href: '/login', label: 'Log in' },
          ]}
        />
      }
    >
      {children}
    </StudioPage>
  );
}
