import { redirect } from 'next/navigation';

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function LoginPage() {
  // Dev mode (no Supabase): there is no login — go straight to the app.
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/');

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16 text-center">
      <p className="font-display text-xl tracking-tight text-accent">Chronos</p>
      <h1 className="font-display mt-3 text-3xl sm:text-4xl">Your second memory</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted">
        Sign in to keep your story. It stays yours — you can export or delete everything, any
        time.
      </p>
      <div className="mt-8">
        <GoogleSignInButton />
      </div>
      <p className="mx-auto mt-6 max-w-sm text-xs leading-5 text-muted">
        By continuing you agree to the{' '}
        <a
          href="/terms"
          className="underline decoration-line underline-offset-2 hover:text-accent"
        >
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
    </main>
  );
}
