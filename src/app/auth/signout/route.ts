import { NextResponse } from 'next/server';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: Request): Promise<Response> {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  // 303 so the POST becomes a GET to /login.
  return NextResponse.redirect(new URL('/login', new URL(request.url).origin), { status: 303 });
}
