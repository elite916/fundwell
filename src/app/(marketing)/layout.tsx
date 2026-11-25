import { PropsWithChildren } from 'react';

import { MarketingHeader } from '@/components/layout/marketing-header';
import { StudioPage } from '@/components/studio/shell/studio-page';

export default function MarketingLayout({ children }: PropsWithChildren) {
  return <StudioPage header={<MarketingHeader />}>{children}</StudioPage>;
}
