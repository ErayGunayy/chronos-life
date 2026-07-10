import Link from 'next/link';
import type { ReactNode } from 'react';

interface LegalPageProps {
  title: string;
  updated: string;
  children: ReactNode;
}

/** Shared shell for the public /privacy and /terms pages — same calm surface as
 * the rest of the app, readable measure, and cross-links at the foot. */
export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10 sm:py-14">
      <header>
        <Link
          href="/"
          className="text-sm text-muted underline decoration-line underline-offset-2 hover:text-accent"
        >
          ← Chronos
        </Link>
        <p className="font-display mt-4 text-xl tracking-tight text-accent">Chronos</p>
        <h1 className="font-display mt-1 text-3xl sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
      </header>

      <div className="flex flex-col gap-7">{children}</div>

      <footer className="border-t border-line pt-6 text-sm text-muted">
        <Link
          href="/privacy"
          className="underline decoration-line underline-offset-2 hover:text-accent"
        >
          Privacy
        </Link>
        {' · '}
        <Link
          href="/terms"
          className="underline decoration-line underline-offset-2 hover:text-accent"
        >
          Terms
        </Link>
        {' · '}
        <a
          href="mailto:alieray11130@gmail.com"
          className="underline decoration-line underline-offset-2 hover:text-accent"
        >
          Contact
        </a>
      </footer>
    </main>
  );
}

/** One titled section of a legal page. */
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-lg text-foreground">{heading}</h2>
      <div className="flex flex-col gap-2 text-sm leading-6 text-muted">{children}</div>
    </section>
  );
}
