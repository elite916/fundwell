import type { StaticImageData } from 'next/image';

import closing from './stills/closing.webp';
import closingPhone from './stills/closing-phone.webp';
import diamond from './stills/diamond.webp';
import diamondPhone from './stills/diamond-phone.webp';
import squares from './stills/squares.webp';
import squaresPhone from './stills/squares-phone.webp';
import winner from './stills/winner.webp';
import winnerPhone from './stills/winner-phone.webp';

export interface SceneStill {
  wide: StaticImageData;
  phone: StaticImageData;
}

/** Pre-rendered frames of the scene: what shows first, and all that shows without WebGL, motion or JavaScript. */
export const STILLS = {
  squares: { wide: squares, phone: squaresPhone },
  diamond: { wide: diamond, phone: diamondPhone },
  winner: { wide: winner, phone: winnerPhone },
  closing: { wide: closing, phone: closingPhone },
} satisfies Record<string, SceneStill>;
