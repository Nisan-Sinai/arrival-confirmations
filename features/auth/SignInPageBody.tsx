import Link from 'next/link';

import { signInAction } from '@/app/actions/auth';
import { Alert } from '@/components/ui/feedback';
import { getDictionary } from '@/config/dictionary';
import { AuthForm } from '@/features/auth/AuthForm';
import { AuthFragmentNotice } from '@/features/auth/AuthFragmentNotice';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { localePath, type Locale } from '@/lib/i18n';

/**
 * The sign-in page, shared by both locales.
 *
 * `/auth/callback` sends the browser here with `?error=…` when a one-time code is
 * expired or already spent. Without the alert the host lands on a plain form with no
 * sign their reset link failed, and tries the same dead link again.
 */
export function SignInPageBody({ locale, error }: { locale: Locale; error?: string }) {
  const { auth } = getDictionary(locale);

  return (
    <>
      <SiteHeader minimal locale={locale} />
      <main
        id="main"
        className="from-secondary/30 flex flex-1 flex-col items-center justify-center gap-5 bg-gradient-to-b to-transparent px-5 py-16 sm:py-24"
      >
        {/* Expired and generic are separated because the advice differs: one is
            "request another", the other is "something went wrong". */}
        {error === 'expired' && (
          <Alert tone="error" className="w-full max-w-md">
            {auth.loginNotice.expiredLead}{' '}
            <Link
              href={localePath(locale, '/forgot-password')}
              className="font-semibold underline underline-offset-2"
            >
              {auth.loginNotice.expiredLink}
            </Link>
            .
          </Alert>
        )}
        {error === 'auth' && (
          <Alert tone="error" className="w-full max-w-md">
            {auth.loginNotice.authFailed}
          </Alert>
        )}
        {/* Supabase reports an expired link in the URL fragment when it falls back to
            the Site URL, and the server cannot see a fragment. */}
        <AuthFragmentNotice locale={locale} />
        <AuthForm action={signInAction} mode="signIn" locale={locale} />
      </main>
    </>
  );
}
