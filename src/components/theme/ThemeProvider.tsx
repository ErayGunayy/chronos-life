'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * Theme root (CLAUDE.md §8): light / dark / system, defaulting to system.
 * next-themes toggles the `.dark` class on <html> (see globals.css) and
 * injects a pre-hydration script so the right theme paints on first frame.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
