import type { Metadata } from 'next';
import Link from 'next/link';

import { updatePasswordAction } from '@/app/actions/auth';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AuthForm } from '@/features/auth/AuthForm';
import { createUserClient } from '@/lib/server/supabase';

/**
 * Choosing a new password (§8).
 *
 * This route did not exist. `requestPasswordResetAction` had been mailing hosts a link
 * to `/reset-password` since the feature was written, and that address returned 404 —
 * so password recovery was unrecoverable, and the action that would have completed it
 * (`updatePasswordAction`) had no caller anywhere in the codebase.
 *
 * The session is established before the browser gets here: the mail points at
 * `/auth/callback?next=/reset-password`, which spends the one-time code and sets the
 * cookies. That is why this page can simply ask whether a user exists.
 */

export const metadata: Metadata = {
  title: 'בחירת סיסמה חדשה',
  robots: { index: false, follow: false },
};

// The recovery session lives in a cookie set moments ago; nothing here may be cached.
export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not a redirect to /login: arriving here without a session almost always means the
  // link expired, and "log in to reset your password" is advice that cannot be taken
  // by the one person who needs this page.
  if (user === null) {
    return (
      <main
        id="main"
        className="from-secondary/30 flex flex-1 items-center justify-center bg-gradient-to-b to-transparent px-5 py-16 sm:py-24"
      >
        <Card padding="lg" className="mx-auto w-full max-w-md text-center">
          <h1 className="text-h2 text-primary font-bold">הקישור פג תוקף</h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            קישורי איפוס תקפים לזמן מוגבל וניתן להשתמש בהם פעם אחת בלבד. בקשו קישור חדש ונשלח אותו
            שוב.
          </p>
          <Link href="/forgot-password" className={buttonClass({ size: 'lg', className: 'mt-7' })}>
            בקשת קישור חדש
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main
      id="main"
      className="from-secondary/30 flex flex-1 items-center justify-center bg-gradient-to-b to-transparent px-5 py-16 sm:py-24"
    >
      <AuthForm
        action={updatePasswordAction}
        mode="setPassword"
        title="בחירת סיסמה חדשה"
        subtitle="לאחר השמירה תיכנסו אוטומטית לחשבון."
        submitLabel="שמירת הסיסמה"
        pendingLabel="שומר…"
      />
    </main>
  );
}
