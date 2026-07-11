'use client';

import { useState, useSyncExternalStore } from 'react';

import { EmailPasswordForm } from '@/components/auth/EmailPasswordForm';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { OnboardingIntro } from '@/components/auth/OnboardingIntro';

const ONBOARDING_SEEN_KEY = 'chronos:onboarding-seen';

const emptySubscribe = () => () => {};

/**
 * Whether this browser has already seen the intro. Server snapshot is false
 * (SSR can't read localStorage); React re-renders with the real value right
 * after hydration — the hydration-safe way to read client-only state.
 */
function useOnboardingSeen(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => window.localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true',
    () => false,
  );
}

/**
 * The signed-out experience: a one-time intro (what Chronos is, before any
 * ask — §5.8's "value before input"), then the sign-in card. "Seen" is plain
 * localStorage — cosmetic UX state, not security.
 */
export function LoginExperience() {
  const hasSeenIntro = useOnboardingSeen();
  // Set when the user finishes the intro in this visit (storage alone can't
  // re-render us — the snapshot only re-reads when something triggers it).
  const [isDismissed, setIsDismissed] = useState(false);

  const finishIntro = () => {
    window.localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    setIsDismissed(true);
  };

  const showIntro = !hasSeenIntro && !isDismissed;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16 text-center">
      {showIntro ? <OnboardingIntro onDone={finishIntro} /> : <AuthCard />}
    </main>
  );
}

function AuthCard() {
  return (
    <div className="ring-reveal">
      <p className="font-display text-xl tracking-tight text-accent">Chronos</p>
      <h1 className="font-display mt-3 text-3xl sm:text-4xl">Your second memory</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted">
        Sign in to keep your story. It stays yours — you can export or delete everything, any
        time.
      </p>

      <div className="mt-8">
        <GoogleSignInButton />
      </div>

      <div className="mx-auto mt-6 flex w-full max-w-xs items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-muted">or continue with email</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="mx-auto mt-4 w-full max-w-xs">
        <EmailPasswordForm />
      </div>

      <p className="mx-auto mt-6 max-w-sm text-xs leading-5 text-muted">
        By continuing you agree to the{' '}
        <a href="/terms" className="underline decoration-line underline-offset-2 hover:text-accent">
          Terms
        </a>{' '}
        and{' '}
        <a
          href="/privacy"
          className="underline decoration-line underline-offset-2 hover:text-accent"
        >
          Privacy policy
        </a>
        .
      </p>
    </div>
  );
}
