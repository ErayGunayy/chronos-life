import { redirect } from 'next/navigation';

import { LoginExperience } from '@/components/auth/LoginExperience';
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

  return <LoginExperience />;
}
