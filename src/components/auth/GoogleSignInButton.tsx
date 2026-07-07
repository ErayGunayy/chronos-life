'use client';

import { useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';

type Props = {
  /** Where to land after sign-in (defaults to home). */
  next?: string;
};

export function GoogleSignInButton({ next }: Props) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const supabase = createBrowserSupabase();
      const suffix = next ? `?next=${encodeURIComponent(next)}` : '';
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback${suffix}` },
      });
      if (oauthError) throw oauthError;
      // Success redirects the browser to Google; nothing else to do here.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
      setIsBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={signIn}
        disabled={isBusy}
        className="inline-flex items-center gap-3 rounded-full border border-line bg-card px-6 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleGlyph />
        {isBusy ? 'Opening Google…' : 'Continue with Google'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.583c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.583 9 3.583z"
      />
    </svg>
  );
}
