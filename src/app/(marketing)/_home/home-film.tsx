'use client';

import { useRef } from 'react';

import { StillPicture } from '@/components/studio/scene/scene-still';
import { STILLS } from '@/components/studio/scene/stills';
import { StudioScene } from '@/components/studio/scene/studio-scene';
import { TextLink } from '@/components/studio/text-link';
import { Display, Mid, Soft } from '@/components/studio/type';
import { cn } from '@/utils/cn';

import css from './home.module.css';

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** The first three screens: one board that scrolls from squares to hit-a-thon to how squares works. */
export function HomeFilm() {
  const filmRef = useRef<HTMLDivElement>(null);
  const twoRef = useRef<HTMLElement>(null);
  const holdRef = useRef<HTMLDivElement>(null);

  const readScroll = () => {
    const two = twoRef.current?.offsetTop ?? 1;
    const hold = holdRef.current?.offsetTop ?? 2;
    const end = hold + (holdRef.current?.offsetHeight ?? 0) - innerHeight;
    if (scrollY < two) return clamp(scrollY / two);
    if (scrollY < hold) return 1 + clamp((scrollY - two) / (hold - two));
    return 2 + clamp((scrollY - hold) / Math.max(1, end - hold));
  };

  // Words leave before the board moves and come back once it has settled.
  const showProgress = (t: number) => {
    const film = filmRef.current;
    if (!film) return;
    film.style.setProperty('--one', (1 - clamp((t - 0.1) / 0.2)).toFixed(3));
    film.style.setProperty('--two', Math.min(clamp((t - 0.76) / 0.2), 1 - clamp((t - 1.08) / 0.2)).toFixed(3));
    film.style.setProperty('--three', clamp((t - 1.74) / 0.2).toFixed(3));
    film.dataset.step = t < 2.1 ? '1' : t < 2.64 ? '2' : '3';
    film.dataset.settled = String(t > 1.7);
  };

  // The film grows when the scene goes live. Whatever the reader is looking at stays where it is.
  const switchLive = (live: boolean) => {
    const film = filmRef.current;
    if (!film) return;
    const parts = [twoRef.current, holdRef.current, film.nextElementSibling];
    const reading = parts.findLast((part) => part && part.getBoundingClientRect().top < innerHeight / 2);
    const before = reading?.getBoundingClientRect().top ?? 0;
    const root = document.documentElement;
    root.style.overflowAnchor = 'none';
    film.dataset.live = String(live);
    if (reading) scrollBy({ top: reading.getBoundingClientRect().top - before, behavior: 'instant' });
    requestAnimationFrame(() => root.style.removeProperty('overflow-anchor'));
  };

  return (
    <div
      ref={filmRef}
      className={css.film}
      // The scene flips this; the CSS gives the film room to scroll only while it is live.
      data-live='false'
    >
      <div className={css.stageBox}>
        <div className={css.stage}>
          <StudioScene
            eager
            still={STILLS.squares}
            progress={readScroll}
            onProgress={showProgress}
            onLive={switchLive}
          />
        </div>
      </div>
      <section className={css.screen}>
        <StillPicture still={STILLS.squares} eager className={css.still} />
        <Display as='h1' className={css.oneTitle}>
          Fund your team with a game
        </Display>
        <div className={css.oneSay}>
          <Soft>Pick a fundraiser, share one link, and track payments.</Soft>
          <TextLink look='button' href='/signup' className={css.oneButton}>
            Start a fundraiser
          </TextLink>
        </div>
      </section>
      <section ref={twoRef} className={cn(css.screen, css.two)}>
        <StillPicture still={STILLS.diamond} className={css.still} />
        <Display as='h2' className={css.twoTitle}>
          Hit-a-thon
        </Display>
        <div className={css.twoSay}>
          <Soft>Supporters pledge for every hit. Coming soon.</Soft>
        </div>
      </section>
      <div ref={holdRef} className={css.hold}>
        <section className={css.screen}>
          <StillPicture still={STILLS.winner} className={css.still} />
          <div className={css.three}>
            <Mid as='h2' className={css.threeTitle}>
              How squares works
            </Mid>
            <ol className={css.lines}>
              <li>Share your link</li>
              <li>People claim squares</li>
              <li>The score picks the winner</li>
            </ol>
            <Soft className={css.threeSay}>Run it on any football game, from a rivalry night to the Super Bowl.</Soft>
          </div>
        </section>
      </div>
    </div>
  );
}
