'use client';

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react';

import { cn } from '@/utils/cn';

import type { SceneBoard } from './boards';
import type { SceneEngine } from './engine';
import { StillPicture } from './scene-still';
import type { SceneStill } from './stills';

import css from './scene.module.css';

interface StudioSceneProps {
  /** What shows until the scene is ready, and instead of it when it can't run. */
  still: SceneStill;
  /**
   * Where the story is, 0 to 3 (see `MOMENTS`). A number moves there smoothly.
   * A function is read on every scroll and resize, for a page that scrolls through the story.
   */
  progress?: number | (() => number);
  /** A fixed board instead of the story. Keep the same object between renders. */
  board?: SceneBoard | null;
  /** Called with the smoothed progress on every frame that moves. */
  onProgress?: (progress: number) => void;
  /** Called when the live scene takes over from the still, and when it hands back. */
  onLive?: (live: boolean) => void;
  /** Load the still right away: for the first screen. */
  eager?: boolean;
  className?: string;
}

const REDUCED = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void) {
  const query = matchMedia(REDUCED);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function hasWebGL(): boolean {
  try {
    // Not when it would be drawn without a graphics card: that froze the page, up to 14 seconds in a test
    const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

/**
 * The lit 3D board, filling its nearest positioned parent. Decorative: hidden from screen readers.
 * `three` is only downloaded once this is on screen, motion is allowed and WebGL works.
 */
export function StudioScene({
  still,
  progress = 0,
  board = null,
  onProgress,
  onLive,
  eager,
  className,
}: StudioSceneProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SceneEngine | null>(null);
  const [isLive, setIsLive] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeToReducedMotion,
    () => matchMedia(REDUCED).matches,
    () => true
  );

  const readProgress = useEffectEvent(() => (typeof progress === 'function' ? progress() : progress));
  const readBoard = useEffectEvent(() => board);
  const reportProgress = useEffectEvent((value: number) => onProgress?.(value));
  const reportLive = useEffectEvent((live: boolean) => {
    setIsLive(live);
    onLive?.(live);
  });

  // Sets the WebGL scene up and tears it down.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || reduced) return;
    let stopped = false;
    let engine: SceneEngine | null = null;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      observer.disconnect();
      if (!engine) return;
      engine.dispose();
      engineRef.current = null;
      reportLive(false);
    };

    const start = async () => {
      // The still goes first, so three never competes with it.
      const image = stage.parentElement?.querySelector('img');
      await image?.decode().catch(() => undefined);
      if (stopped || !hasWebGL()) return;
      const { createSceneEngine } = await import('./engine');
      if (stopped) return;
      engine = createSceneEngine({
        parent: stage,
        progress: () => readProgress(),
        board: readBoard(),
        onProgress: (value) => reportProgress(value),
        onReady: () => reportLive(true),
        onLost: stop,
      });
      engineRef.current = engine;
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      start().catch(() => undefined);
    });
    observer.observe(stage);

    return stop;
  }, [reduced]);

  // Hands new props to the running scene.
  useEffect(() => {
    engineRef.current?.update(board);
  }, [progress, board]);

  return (
    <div aria-hidden='true' className={cn(css.scene, isLive && css.live, className)}>
      <StillPicture still={still} eager={eager} className={css.still} />
      <div ref={stageRef} className={css.stage} />
    </div>
  );
}
