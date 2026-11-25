'use client';

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';

import css from './auth.module.css';

// Public site key from Cloudflare. Unset means no check: nothing renders and Cloudflare is never contacted.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
// The submit button waits this long at most, so Cloudflare being down never locks the form.
const MAX_WAIT_MS = 10_000;

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string | undefined;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface Check {
  token?: string;
  /** True while Cloudflare is still deciding. */
  waiting: boolean;
}

let scriptPromise: Promise<TurnstileApi> | undefined;

function loadTurnstile() {
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');

    function fail() {
      script.remove();
      scriptPromise = undefined;
      reject(new Error('Turnstile did not load'));
    }

    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : fail());
    script.onerror = fail;
    document.head.append(script);
  });

  return scriptPromise;
}

function TurnstileWidget({ onChange }: { onChange: Dispatch<SetStateAction<Check>> }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let widgetId: string | undefined;
    let timer: ReturnType<typeof setTimeout>;

    function settle(token?: string) {
      if (!active) return;
      clearTimeout(timer);
      onChange({ token, waiting: false });
    }

    function wait() {
      if (!active) return;
      clearTimeout(timer);
      timer = setTimeout(settle, MAX_WAIT_MS);
      onChange({ waiting: true });
    }

    wait();

    loadTurnstile()
      .then((turnstile) => {
        if (!active || !containerRef.current) return;

        widgetId = turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: 'light',
          // Same breakpoint as .captcha in auth.module.css
          size: window.matchMedia('(max-width: 359px)').matches ? 'compact' : 'flexible',
          'response-field': false,
          callback: settle,
          'expired-callback': wait,
          'error-callback': () => {
            settle();
            return true;
          },
          'unsupported-callback': () => settle(),
        });
      })
      .catch(() => settle());

    return () => {
      active = false;
      clearTimeout(timer);
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [onChange]);

  return <div ref={containerRef} className={css.captcha} />;
}

/** Cloudflare Turnstile for one form. Supabase checks the token, so a missing one is sent as is. */
export function useTurnstile() {
  const [check, setCheck] = useState<Check>({ waiting: Boolean(SITE_KEY) });
  const [attempt, setAttempt] = useState(0);

  /** A token works once: call this after every use that stays on the page. */
  function reset() {
    if (!SITE_KEY) return;
    setCheck({ waiting: true });
    setAttempt((prev) => prev + 1);
  }

  return {
    ...check,
    reset,
    widget: SITE_KEY ? <TurnstileWidget key={attempt} onChange={setCheck} /> : null,
  };
}
