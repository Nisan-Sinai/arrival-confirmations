import Link from 'next/link';

import { updatePasswordAction } from '@/app/actions/auth';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getDictionary } from '@/config/dictionary';
import { AuthForm } from '@/features/auth/AuthForm';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { localePath, type Locale } from '@/lib/i18n';
import { createUserClient } from '@/lib/server/supabase';

/**
 * Choosing a new password (§8), shared by both locales.
 *
 * The session is established before the browser gets here: the mail points at
 * `/auth/callback?next=/reset-password`, which spends the one-time code and sets the
 * cookies. So this page can simply ask whether a user exists — and if none does, the
 * link almost certainly expired, and "log in to reset your password" is advice the one
 * person who needs this page cannot take.
 */
export async function ResetPasswordPageBody({ locale }: { locale: Locale }) {
  const { auth } = getDictionary(locale);
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    return (
      <>
        <SiteHeader minimal locale={locale} />
        <main
          id="main"
          className="from-secondary/30 flex flex-1 items-center justify-center bg-gradient-to-b to-transparent px-5 py-16 sm:py-24"
        >
          <Card padding="lg" className="mx-auto w-full max-w-md text-center">
            <h1 className="text-h2 text-primary font-bold">{auth.resetExpired.title}</h1>
            <p className="text-muted-foreground mt-3 leading-relaxed">{auth.resetExpired.body}</p>
            <Link
              href={localePath(locale, '/forgot-password')}
              className={buttonClass({ size: 'lg', className: 'mt-7' })}
            >
              {auth.resetExpired.cta}
            </Link>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader minimal locale={locale} />
      <main
        id="main"
        className="from-secondary/30 flex flex-1 items-center justify-center bg-gradient-to-b to-transparent px-5 py-16 sm:py-24"
      >
        <AuthForm action={updatePasswordAction} mode="setPassword" locale={locale} />
      </main>
    </>
  );
}
