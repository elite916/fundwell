import type { SceneStill } from './stills';

interface StillPictureProps {
  still: SceneStill;
  /** Load right away: for the first screen. */
  eager?: boolean;
  className?: string;
}

/** A pre-rendered frame that fills its box. Fine on its own where nothing moves. */
export function StillPicture({ still, eager, className }: StillPictureProps) {
  return (
    <picture className={className}>
      <source media='(max-width: 699px)' srcSet={still.phone.src} />
      <img
        src={still.wide.src}
        alt=''
        width={still.wide.width}
        height={still.wide.height}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
      />
    </picture>
  );
}
