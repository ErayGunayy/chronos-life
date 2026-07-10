import Link from 'next/link';

import { DeleteEverythingSection } from '@/components/settings/DeleteEverythingSection';
import { ghostButton } from '@/components/today/ui';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabase } from '@/lib/supabase/server';

/** Ownership & Longevity (§5.11): export and delete live together, both frictionless. */
export default async function SettingsPage() {
  let email: string | null = null;
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10 sm:py-14">
      <header>
        <Link
          href="/"
          className="text-sm text-muted underline decoration-line underline-offset-2 hover:text-accent"
        >
          ← Today
        </Link>
        <p className="font-display mt-4 text-xl tracking-tight text-accent">Chronos</p>
        <h1 className="font-display mt-1 text-3xl sm:text-4xl">Your data</h1>
      </header>

      {email && (
        <section className="rounded-xl border border-line bg-card p-5">
          <h2 className="font-display text-xl">Account</h2>
          <p className="mt-2 text-sm text-muted">Signed in as {email}.</p>
          <form action="/auth/signout" method="post" className="mt-3">
            <button type="submit" className={ghostButton}>
              Sign out
            </button>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="font-display text-xl">Export</h2>
        <p className="mt-2 text-sm text-muted">
          Your memories, in full, any time — plain files that outlive Chronos.
        </p>
        <p className="mt-3 text-sm">
          <a
            className="underline decoration-line underline-offset-2 hover:text-accent"
            href="/api/export?format=markdown"
          >
            Export as Markdown
          </a>
          {' · '}
          <a
            className="underline decoration-line underline-offset-2 hover:text-accent"
            href="/api/export?format=json"
          >
            Export as JSON
          </a>
        </p>
      </section>

      <DeleteEverythingSection />

      <footer className="mt-2 text-sm text-muted">
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
      </footer>
    </main>
  );
}
