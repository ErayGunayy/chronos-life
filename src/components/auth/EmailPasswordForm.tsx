'use client';

import { useState } from 'react';
import { z } from 'zod';

import { fieldLabel, primaryButton, textInput } from '@/components/today/ui';
import { createBrowserSupabase } from '@/lib/supabase/client';

const CredentialsSchema = z.object({
  email: z.email({ message: 'Enter a valid email.' }),
  password: z.string().min(8, { message: 'Use at least 8 characters.' }),
});

type Mode = 'sign-in' | 'sign-up';

type Props = {
  /** Where to land after sign-in (defaults to home). */
  next?: string;
};

/** Supabase's raw errors, softened where it's cheap to do so. */
function friendlyError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return "That email or password doesn't look right.";
  }
  if (/already registered/i.test(message)) {
    return 'That email already has an account — try signing in instead.';
  }
  return message;
}

/**
 * Email + password sign-in / sign-up, same session mechanism as Google
 * (Supabase cookie sessions — the data layer only ever sees user.id).
 */
export function EmailPasswordForm({ next }: Props) {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const parsed = CredentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your email and password.');
      return;
    }

    setIsBusy(true);
    try {
      const supabase = createBrowserSupabase();
      const destination = next ?? '/';

      if (mode === 'sign-up') {
        const suffix = next ? `?next=${encodeURIComponent(next)}` : '';
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback${suffix}` },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          // Hard navigation so the server sees the fresh session cookie.
          window.location.assign(destination);
          return;
        }
        // Email confirmation is required by the project settings.
        setNotice('Check your email to confirm your account, then come back and sign in.');
        setIsBusy(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (signInError) throw signInError;
      window.location.assign(destination);
    } catch (cause) {
      setError(friendlyError(cause instanceof Error ? cause.message : 'Something went wrong.'));
      setIsBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 text-left">
      <div>
        <label htmlFor="auth-email" className={fieldLabel}>
          Email
        </label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={textInput}
          required
        />
      </div>
      <div>
        <label htmlFor="auth-password" className={fieldLabel}>
          Password
        </label>
        <input
          id="auth-password"
          type="password"
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={textInput}
          required
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-accent">
          {notice}
        </p>
      )}

      <button type="submit" disabled={isBusy} className={`${primaryButton} mt-1`}>
        {isBusy ? 'One moment…' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
          setError(null);
          setNotice(null);
        }}
        className="mx-auto mt-1 text-xs text-muted underline decoration-line underline-offset-2 transition-colors hover:text-accent"
      >
        {mode === 'sign-in' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
      </button>
    </form>
  );
}
