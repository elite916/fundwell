import { StudioPage } from '@/components/studio/shell/studio-page';
import { Soft } from '@/components/studio/type';

import css from './contest.module.css';

// The page streams in after this, in a hidden element that a script moves into place. Without JavaScript nothing moves
// it, so show it where it is. The layer is Tailwind's first one: an important rule there beats its `[hidden]` reset.
const WITHOUT_JS = `
  [data-contest-loading] { display: none }
  @layer theme { [hidden][id^='S:'] { display: contents !important } }
`;

export default function ContestLoading() {
  return (
    <div data-contest-loading>
      <noscript>
        <style>{WITHOUT_JS}</style>
      </noscript>
      <StudioPage footer={null}>
        <div className={css.loading}>
          <Soft role='status'>Loading...</Soft>
        </div>
      </StudioPage>
    </div>
  );
}
