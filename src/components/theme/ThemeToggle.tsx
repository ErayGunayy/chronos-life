'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

type ThemeChoice = 'light' | 'dark' | 'system';

const ORDER: readonly ThemeChoice[] = ['light', 'dark', 'system'];

const LABELS: Record<ThemeChoice, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

const emptySubscribe = () => () => {};

/** False on the server render, true once hydrated — no setState-in-effect. */
function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/**
 * A single quiet button cycling light → dark → system (§5.9: one small
 * control, no competing segmented switch, no flashy motion). The theme isn't
 * knowable at SSR time, so it renders a neutral placeholder until mounted.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isMounted = useIsMounted();

  const current: ThemeChoice = ORDER.includes(theme as ThemeChoice)
    ? (theme as ThemeChoice)
    : 'system';
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={isMounted ? `Theme: ${LABELS[current]}. Switch to ${LABELS[next]}.` : 'Theme'}
      title={isMounted ? `Theme: ${LABELS[current]}` : undefined}
      className="fixed top-4 right-4 z-50 inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card/80 text-muted backdrop-blur transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {isMounted ? <ThemeGlyph choice={current} /> : <span aria-hidden>·</span>}
    </button>
  );
}

function ThemeGlyph({ choice }: { choice: ThemeChoice }) {
  if (choice === 'light') {
    // Sun
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
      </svg>
    );
  }
  if (choice === 'dark') {
    // Moon
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    );
  }
  // System — a small monitor
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M9 21h6m-3-4v4" />
    </svg>
  );
}
