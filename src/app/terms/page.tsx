import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalPage, LegalSection } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Terms — Chronos',
  description: 'The simple agreement for using Chronos.',
};

const CONTACT = 'alieray11130@gmail.com';

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="10 July 2026">
      <p className="text-sm leading-6 text-muted">
        These terms are the agreement between you and me (an individual developer) for using Chronos.
        They&apos;re written plainly on purpose. By using Chronos, you agree to them. If you don&apos;t,
        please don&apos;t use the app.
      </p>

      <LegalSection heading="What Chronos is">
        <p>
          Chronos is a personal tool for remembering and reflecting on your own life. It is{' '}
          <strong className="text-foreground">not</strong> medical, psychological, legal, or any
          other kind of professional advice, and it isn&apos;t a substitute for a professional. If
          something in your life needs real help, please seek it from a qualified person.
        </p>
      </LegalSection>

      <LegalSection heading="Who can use it">
        <p>
          You need to be at least 16 years old to use Chronos. By using it, you confirm that you are.
        </p>
      </LegalSection>

      <LegalSection heading="Your content stays yours">
        <p>
          Everything you record in Chronos belongs to you. You keep all rights to it. You grant me
          only the narrow permission needed to actually run the service — to store your content,
          process it (including sending it to the AI provider described in the{' '}
          <Link
            href="/privacy"
            className="underline decoration-line underline-offset-2 hover:text-accent"
          >
            Privacy policy
          </Link>
          ), and show it back to you. I claim no ownership of your memories and use them for nothing
          else.
        </p>
      </LegalSection>

      <LegalSection heading="About the AI">
        <p>
          Chronos uses AI to organize your words and to offer reflections and patterns. These are{' '}
          <strong className="text-foreground">suggestions, not truth</strong> — they can be wrong,
          incomplete, or off the mark, and you should treat them that way. The facts you record are
          yours and are never silently rewritten by the AI. You always have the final say over what
          anything means.
        </p>
      </LegalSection>

      <LegalSection heading="Using it fairly">
        <p>Please don&apos;t:</p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>try to break, overload, or get around the app&apos;s security or usage limits;</li>
          <li>use it to store other people&apos;s personal data unlawfully;</li>
          <li>use it for anything illegal.</li>
        </ul>
        <p>
          There&apos;s a daily limit on how many stories can be added, to keep the service
          sustainable for everyone.
        </p>
      </LegalSection>

      <LegalSection heading="No guarantees">
        <p>
          Chronos is provided <strong className="text-foreground">as is</strong> and{' '}
          <strong className="text-foreground">as available</strong>. It&apos;s an early product run by
          one person: features may change, and the service may occasionally be unavailable. Always
          keep your own copy of anything important — Chronos makes that easy with export. To the
          extent the law allows, I&apos;m not liable for losses arising from using (or being unable to
          use) Chronos.
        </p>
      </LegalSection>

      <LegalSection heading="Stopping">
        <p>
          You can stop using Chronos and delete your data whenever you like, from{' '}
          <Link
            href="/settings"
            className="underline decoration-line underline-offset-2 hover:text-accent"
          >
            settings
          </Link>
          . I may suspend or remove an account that abuses the service or these terms.
        </p>
      </LegalSection>

      <LegalSection heading="Changes, and the fine print">
        <p>
          If these terms change, the date at the top will change too. These terms are governed by the
          laws of the Republic of Türkiye. Questions? Email me at{' '}
          <a
            href={`mailto:${CONTACT}`}
            className="underline decoration-line underline-offset-2 hover:text-accent"
          >
            {CONTACT}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
