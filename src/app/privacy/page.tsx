import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalPage, LegalSection } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy — Chronos',
  description: 'What Chronos stores, why, and the control you keep over it.',
};

const CONTACT = 'alieray11130@gmail.com';

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="10 July 2026">
      <p className="text-sm leading-6 text-muted">
        Chronos is a personal memory tool. It holds some of the most personal
        writing you can keep — the story of your days — so how it treats that
        writing matters more than any feature. Chronos is built and run by me, an
        individual developer. You can reach me any time at{' '}
        <a
          href={`mailto:${CONTACT}`}
          className="underline decoration-line underline-offset-2 hover:text-accent"
        >
          {CONTACT}
        </a>
        .
      </p>

      <LegalSection heading="The short version">
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>Your memories are yours. I never sell them and never use them for advertising.</li>
          <li>
            You can <strong className="text-foreground">export everything</strong> or{' '}
            <strong className="text-foreground">delete everything</strong> at any time, with no
            friction, from{' '}
            <Link
              href="/settings"
              className="underline decoration-line underline-offset-2 hover:text-accent"
            >
              your settings
            </Link>
            .
          </li>
          <li>
            The only outside services involved are the ones needed to run Chronos: Google (sign-in
            and AI), and Supabase (database). They are named below.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="What Chronos stores">
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>
            <strong className="text-foreground">Your account.</strong> When you sign in with Google,
            Chronos receives your name, email address, and Google account identifier. Chronos never
            sees or stores a password — Google handles that.
          </li>
          <li>
            <strong className="text-foreground">Your memories.</strong> The words you write or
            dictate about your day, and what Chronos derives from them: event titles, approximate
            times, categories, and any people, places, or notes you choose to include.
          </li>
          <li>
            <strong className="text-foreground">A little technical data.</strong> Your time zone,
            and a per-day count of how many stories you&apos;ve added (this is what powers the daily
            usage limit). A sign-in cookie keeps you logged in.
          </li>
        </ul>
        <p>
          Chronos uses <strong className="text-foreground">no analytics, tracking, or advertising
          cookies</strong>.
        </p>
      </LegalSection>

      <LegalSection heading="How your story becomes a timeline (AI)">
        <p>
          To turn what you write into events on a timeline, the text of your story is sent to
          Chronos&apos;s AI provider, <strong className="text-foreground">Google</strong> (the Gemini
          API), which reads it and returns the events and times it found. AI only ever{' '}
          <em>organizes</em> your words — it never invents memories or silently rewrites the facts
          you recorded, and anything AI writes (summaries, reflections, patterns) is kept separate
          and clearly marked as AI-generated.
        </p>
        <p>
          <strong className="text-foreground">One honest caveat.</strong> Chronos currently uses
          Google&apos;s free AI tier, and Google may use text submitted through it to improve their
          services. If that&apos;s not something you&apos;re comfortable with for your personal
          writing, please{' '}
          <a
            href={`mailto:${CONTACT}`}
            className="underline decoration-line underline-offset-2 hover:text-accent"
          >
            let me know
          </a>{' '}
          — a more private processing option can be arranged, and this page will always tell you the
          current provider.
        </p>
      </LegalSection>

      <LegalSection heading="If you use voice input">
        <p>
          Voice capture uses your browser&apos;s built-in speech recognition. In some browsers (for
          example, Chrome) the audio is sent to the browser&apos;s maker to be transcribed — that
          step is handled by your browser and its vendor, not by Chronos, and is governed by their
          terms. Chronos never records or stores the audio; it only keeps the recognized text, which
          becomes part of your story exactly like typed text.
        </p>
      </LegalSection>

      <LegalSection heading="Where it's stored">
        <p>
          Your data lives in a PostgreSQL database hosted by{' '}
          <strong className="text-foreground">Supabase</strong>. Row-level security is enforced at
          the database itself, so each account can only ever read or change its own memories. At
          runtime Chronos uses only your signed-in session — never an all-powerful admin key.
        </p>
      </LegalSection>

      <LegalSection heading="Who else touches your data (sub-processors)">
        <p>Only the services required to run Chronos, each for a single purpose:</p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>
            <strong className="text-foreground">Google</strong> — sign-in, AI event extraction, and
            (if you use voice) browser-side transcription.
          </li>
          <li>
            <strong className="text-foreground">Supabase</strong> — the database that stores your
            memories.
          </li>
          <li>
            <strong className="text-foreground">The web host</strong> that serves the app.
          </li>
        </ul>
        <p>Your memories are never sold, rented, or shared for advertising with anyone.</p>
      </LegalSection>

      <LegalSection heading="Your control">
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>
            <strong className="text-foreground">Export</strong> your entire history as Markdown or
            JSON — durable files that outlive Chronos — from{' '}
            <Link
              href="/settings"
              className="underline decoration-line underline-offset-2 hover:text-accent"
            >
              settings
            </Link>
            .
          </li>
          <li>
            <strong className="text-foreground">Delete</strong> a single memory, or everything at
            once, from the same place. Deletion is real, not a hidden archive.
          </li>
          <li>
            To delete your <strong className="text-foreground">whole account</strong>, delete
            everything and then email me at{' '}
            <a
              href={`mailto:${CONTACT}`}
              className="underline decoration-line underline-offset-2 hover:text-accent"
            >
              {CONTACT}
            </a>{' '}
            to remove the account record itself.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Keeping it, and keeping it safe">
        <p>
          Chronos keeps your memories until you delete them or ask for your account to be removed —
          it doesn&apos;t expire your data or quietly discard it. Data is encrypted in transit, and
          access is scoped per account at the database. No system is perfectly secure, but Chronos is
          built to hold as little as it needs and to hand it all back to you whenever you ask.
        </p>
      </LegalSection>

      <LegalSection heading="A few more things">
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>
            Chronos isn&apos;t intended for people under 16. If you believe a child has used it,
            contact me and I&apos;ll remove the data.
          </li>
          <li>
            The services above may process data in countries other than your own; that&apos;s an
            unavoidable part of using them.
          </li>
          <li>
            If this policy changes, the date at the top changes with it. Meaningful changes will be
            surfaced in the app rather than slipped in quietly.
          </li>
        </ul>
      </LegalSection>
    </LegalPage>
  );
}
