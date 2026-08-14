import { redirect } from 'next/navigation';

import { HashSessionHandoff } from '@/features/auth/HashSessionHandoff';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { localePath, type Locale } from '@/lib/i18n';
import { safeNextPath } from '@/lib/safeRedirect';
import { createUserClient } from '@/lib/server/supabase';

/**
 * The landing point for every auth link (§8, §4.4), shared by both locales.
 *
 * Supabase can arrive here in three shapes, and only two are visible to the server:
 *   `?code=…`         PKCE, exchanged against a verifier cookie.
 *   `?token_hash=…`   the stateless OTP flow.
 *   `#access_token=…` the implicit flow — a fragment the server never sees, so the
 *                     client component below finishes it.
 *
 * The two server-visible cases redirect before anything renders; the fragment case
 * falls through to the client. Every redirect stays inside the reader's locale so an
 * English recovery is completed on the English side.
 */

/** The link types Supabase issues that this page is willing to complete. */
const OTP_TYPES = new Set(['recovery', 'email', 'signup', 'invite', 'magiclink', 'email_change']);

export async function AuthCallbackPageBody({
  locale,
  params,
}: {
  locale: Locale;
  params: Record<string, string | string[] | undefined>;
}) {
  const one = (key: string): string | null => {
    const value = params[key];
    return typeof value === 'string' ? value : null;
  };

  const failurePath = (reason: string) => `${localePath(locale, '/login')}?error=${reason}`;
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
      <SiteHeader minimal locale={locale} />
      <main
        id="main"
        className="from-secondary/30 flex flex-1 items-center justify-center bg-gradient-to-b to-transparent px-5 py-16 sm:py-24"
      >
        <HashSessionHandoff next={next} locale={locale} />
      </main>
    </>
  );
}
