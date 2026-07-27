import type { Metadata } from 'next';

import { signInAction } from '@/app/actions/auth';
import Link from 'next/link';

import { Alert } from '@/components/ui/feedback';
import { AuthForm } from '@/features/auth/AuthForm';
import { AuthFragmentNotice } from '@/features/auth/AuthFragmentNotice';
import { SiteHeader } from '@/features/layout/SiteHeader';

export const metadata: Metadata = {
  title: 'כניסה לחשבון',
  // §12: account pages have no business in a search index.
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // `/auth/callback` sends the browser here with ?error=auth when a one-time code is
  // expired or already spent. Without this the user lands on a plain login form with
  // no indication that their reset link failed, and tries the same link again.
  const { error } = await searchParams;

  return (
    <>
      <SiteHeader minimal />
      <main
        id="main"
        className="from-secondary/30 flex flex-1 flex-col items-center justify-center gap-5 bg-gradient-to-b to-transparent px-5 py-16 sm:py-24"
      >
        {/* Expired and generic are separated because the advice differs: one is
            "request another", the other is "something went wrong". */}
        {error === 'expired' && (
          <Alert tone="error" className="w-full max-w-md">
            הקישור פג תוקף או שכבר נעשה בו שימוש. קישורי איפוס תקפים לזמן מוגבל ולפעם אחת בלבד —{' '}
            <Link href="/forgot-password" className="font-semibold underline underline-offset-2">
              בקשו קישור חדש
            </Link>
            .
          </Alert>
        )}
        {error === 'auth' && (
          <Alert tone="error" className="w-full max-w-md">
            לא הצלחנו להשלים את ההתחברות. נסו שוב, ואם התקלה חוזרת בקשו קישור חדש.
          </Alert>
        )}
        {/* Supabase reports an expired link in the URL fragment when it falls back to
            the Site URL, and the server cannot see a fragment. */}
        <AuthFragmentNotice />
        <AuthForm
          action={signInAction}
          mode="signIn"
          title="כניסה לחשבון"
          subtitle="נהלו את האירועים שלכם ואת אישורי ההגעה שהתקבלו."
          submitLabel="כניסה"
          pendingLabel="נכנס…"
          footerPrompt="אין לכם חשבון?"
          footerHref="/signup"
          footerLinkLabel="הרשמה חינם"
        />
      </main>
    </>
  );
}
