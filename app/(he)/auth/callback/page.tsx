import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { HashSessionHandoff } from '@/features/auth/HashSessionHandoff';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { safeNextPath } from '@/lib/safeRedirect';
import { createUserClient } from '@/lib/server/supabase';

/**
 * The landing point for every auth link (§8, §4.4).
 *
 * This address did not exist at all: `requestPasswordResetAction` had been mailing
 * hosts a link to it since the feature was written, and it returned 404 — so password
 * recovery was unrecoverable.
 *
 * It is a page rather than a route handler because Supabase can arrive here in three
 * different shapes, and only two of them are visible to the server:
 *
 *   `?code=…`        PKCE. Exchanged against a verifier cookie set when the mail was
 *                    requested, so it only works in the browser that asked for it.
 *   `?token_hash=…`  the OTP flow, when the mail template emits `{{ .TokenHash }}`.
 *                    Stateless, so it survives being opened on a different device.
 *   `#access_token=…` the implicit flow — and this is the one that was actually
 *                    breaking. A fragment is never sent to the server, so a route
 *                    handler physically cannot complete it. Rendering a page lets the
 *                    browser finish the handshake and hand the session back.
 *
 * The two server-visible cases redirect before anything renders; the fragment case
 * falls through to the client component below.
 */

export const metadata: Metadata = {
  title: 'מאמת את הקישור',
  robots: { index: false, follow: false },
};

// A one-time credential is in the URL; nothing about this response may be cached.
export const dynamic = 'force-dynamic';

const failurePath = (reason: string) => `/login?error=${reason}`;

/** The link types Supabase issues that this page is willing to complete. */
const OTP_TYPES = new Set(['recovery', 'email', 'signup', 'invite', 'magiclink', 'email_change']);

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string): string | null => {
    const value = params[key];
    return typeof value === 'string' ? value : null;
  };

  const next = safeNextPath(one('next'));

  // A refused consent or an expired link, reported as query parameters. The provider's
  // own description can name the account, so it is not passed through.
  if (one('error') !== null) {
    redirect(failurePath(one('error_code') === 'otp_expired' ? 'expired' : 'auth'));
  }

  const tokenHash = one('token_hash');
  const type = one('type');
  if (tokenHash !== null && type !== null && OTP_TYPES.has(type)) {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'recovery',
      token_hash: tokenHash,
    });
    redirect(error ? failurePath('expired') : next);
  }

  const code = one('code');
  if (code !== null) {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // Expired, already spent, or issued to a different browser — PKCE keeps its
    // verifier in a cookie, so opening the mail on a phone after requesting the reset
    // on a laptop arrives with a valid code and no way to spend it.
    redirect(error ? failurePath('expired') : next);
  }

  /*
   * Nothing in the query string. Either the tokens are in the fragment — the implicit
   * flow — or the link is genuinely malformed. The client component tells the two
   * apart, because only it can see a fragment.
   */
  return (
    <>
      <SiteHeader minimal />
      <main
        id="main"
        className="from-secondary/30 flex flex-1 items-center justify-center bg-gradient-to-b to-transparent px-5 py-16 sm:py-24"
      >
        <HashSessionHandoff next={next} />
      </main>
    </>
  );
}
