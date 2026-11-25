'use client';

import { useState } from 'react';

import { Button } from '@/components/studio/button';
import { CLOSING_BOARD, MOMENTS, type SceneBoard } from '@/components/studio/scene/boards';
import { STILLS } from '@/components/studio/scene/stills';
import { StudioScene } from '@/components/studio/scene/studio-scene';

import css from './preview.module.css';

type Moment = keyof typeof MOMENTS;

const OWN_BOARD: SceneBoard = {
  claimed: Array.from({ length: 62 }, (_, i) => (i * 37 + 11) % 100),
  winner: [3, 8],
  frame: { az: 0, el: 47, d: 27, spin: -33, x: 0, y: 0 },
};

/** Every state the scene has, one button each. */
export function SceneSwitch() {
  const [moment, setMoment] = useState<Moment>('squares');
  const [board, setBoard] = useState<SceneBoard | null>(null);
  const [isShown, setIsShown] = useState(true);

  return (
    <>
      <p className={css.row}>
        {(Object.keys(MOMENTS) as Moment[]).map((name) => (
          <Button
            key={name}
            look='link'
            onClick={() => {
              setBoard(null);
              setMoment(name);
            }}
          >
            {name}
          </Button>
        ))}
        <Button look='link' onClick={() => setBoard(OWN_BOARD)}>
          own board
        </Button>
        <Button look='link' onClick={() => setBoard(CLOSING_BOARD)}>
          closing
        </Button>
        <Button look='link' onClick={() => setIsShown((shown) => !shown)}>
          {isShown ? 'remove' : 'add'}
        </Button>
      </p>
      <div className={css.sceneBox}>
        {isShown && <StudioScene still={STILLS.squares} progress={MOMENTS[moment]} board={board} />}
      </div>
    </>
  );
}
