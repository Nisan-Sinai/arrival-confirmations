import { AuthForm } from '@/features/auth/AuthForm';
import { SiteHeader } from '@/features/layout/SiteHeader';
import { type Locale } from '@/lib/i18n';
import type { AuthFormState } from '@/app/actions/auth';

/**
 * The centred single-form auth pages — sign-up and password recovery — which differ
 * only in the mode they render and the action they post to. Sign-in and reset carry
 * extra state (an alert, an expired-link branch) and have their own bodies.
 */
export function SimpleAuthPageBody({
  locale,
  mode,
  action,
}: {
  locale: Locale;
  mode: 'signUp' | 'requestReset';
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  return (
    <>
      <SiteHeader minimal locale={locale} />
      <main
        id="main"
        className="from-secondary/30 flex flex-1 items-center justify-center bg-gradient-to-b to-transparent px-5 py-16 sm:py-24"
      >
        <AuthForm action={action} mode={mode} locale={locale} />
      </main>
    </>
  );
}
