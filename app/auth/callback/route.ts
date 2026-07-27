import { NextResponse, type NextRequest } from 'next/server';

import { safeNextPath } from '@/lib/safeRedirect';
import { createUserClient } from '@/lib/server/supabase';

/**
 * The OAuth and email-link landing point (§8, §4.4).
 *
 * This route did not exist. `signInWithGoogleAction` sent Google to
 * `${NEXT_PUBLIC_SITE_URL}/auth/callback` and `requestPasswordResetAction` sent the
 * reset mail to `/reset-password`, and both addresses returned 404 — so Google sign-in
 * and password recovery were unreachable in a way no test covered, because neither
 * action had a caller.
 *
 * What happens here: Supabase hands back a one-time `code`, which is exchanged
 * server-side for a session written to cookies. The code is single-use and short-lived,
 * so it may only be spent once — a second visit to the same callback URL fails, which
 * is correct and is why the failure path redirects rather than retrying.
 */

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

  // Supabase reports a refused or cancelled consent this way rather than by omitting
  // the code. Surfacing it as a generic failure is deliberate: the provider's own
  // description can name the account, and it is not ours to repeat.
  if (searchParams.get('error') !== null) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  if (code === null) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Expired, already spent, or issued for a different browser. One message covers
    // all three; distinguishing them tells an attacker which codes are live.
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
