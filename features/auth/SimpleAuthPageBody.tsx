import type { AuthFormState } from '@/app/actions/auth';
import { AuthForm } from '@/features/auth/AuthForm';
import { AuthShell } from '@/features/auth/AuthShell';
import { type Locale } from '@/lib/i18n';

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
    <AuthShell locale={locale}>
      <AuthForm action={action} mode={mode} locale={locale} />
    </AuthShell>
  );
}
