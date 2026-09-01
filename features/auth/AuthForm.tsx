'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import type { AuthFormState } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { Rule } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
import { defaultLocale, localePath, type Locale } from '@/lib/i18n';

/**
 * Shared shell for every credential form (§8, §9).
 *
 * One component for sign-in, sign-up, recovery and reset because they differ only in
 * which fields they show and where they post. Keeping them identical is also a
 * security property: a sign-up page that looked or behaved differently from sign-in
 * would give away which addresses already hold an account.
 *
 * All copy comes from the dictionary keyed by `mode`, so the page only names the mode
 * and the locale. The links go through `localePath`, and a hidden `locale` field rides
 * along with the submission so the server action can answer in the reader's language.
 */

const INITIAL: AuthFormState = { status: 'idle', message: '' };

type AuthMode = 'signIn' | 'signUp' | 'requestReset' | 'setPassword';

interface AuthFormProps {
  readonly action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  readonly mode: AuthMode;
  readonly locale?: Locale;
}

const MIN_PASSWORD_LENGTH = 12;

export function AuthForm({ action, mode, locale = defaultLocale }: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, INITIAL);
  const { auth } = getDictionary(locale);
  const copy = auth.modes[mode];
  const passwordHint = auth.fields.passwordHint.replace('{min}', String(MIN_PASSWORD_LENGTH));

  const showEmail = mode !== 'setPassword';
  const showPassword = mode !== 'requestReset';
  const isNewPassword = mode === 'signUp' || mode === 'setPassword';

  // Narrowed by mode so the footer copy is the concrete `AuthModeCopy`, not the union
  // that includes the footerless `setPassword` variant.
  const footer =
    mode === 'signIn'
      ? { ...auth.modes.signIn, href: localePath(locale, '/signup') }
      : mode === 'signUp'
        ? { ...auth.modes.signUp, href: localePath(locale, '/login') }
        : mode === 'requestReset'
          ? { ...auth.modes.requestReset, href: localePath(locale, '/login') }
          : null;

  /**
   * Once the mail is away there is nothing useful left on this form — leaving the
   * fields up invites a second, third and fourth send. The confirmation replaces it.
   */
  if (state.status === 'sent') {
    return (
      <Card padding="lg" className="animate-rise mx-auto w-full max-w-md text-center">
        <span
          aria-hidden="true"
          className="border-accent-strong/30 text-accent-strong confirm-ring mx-auto mb-6 flex size-14 items-center justify-center rounded-full border"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-6"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m2 7 10 6 10-6" />
          </svg>
        </span>
        <h1 className="text-h2 text-primary font-bold">{auth.checkInbox}</h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">{state.message}</p>
        <Rule className="my-7" />
        <Link
          href={localePath(locale, '/login')}
          className="text-primary text-sm font-semibold underline-offset-4 hover:underline"
        >
          {auth.backToLogin}
        </Link>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="animate-rise mx-auto w-full max-w-md">
      <div className="text-center">
        <h1 className="text-h2 text-primary font-bold">{copy.title}</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{copy.subtitle}</p>
      </div>

      <Rule className="my-7" />

      <form action={formAction} className="space-y-5" noValidate>
        <input type="hidden" name="locale" value={locale} />

        {showEmail && (
          <Field label={auth.fields.email} required>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              dir="ltr"
              className="text-start"
              placeholder="name@example.com"
              // Echoed from the action so a rejected attempt does not blank the field.
              defaultValue={state.email ?? ''}
            />
          </Field>
        )}

        {showPassword && (
          <Field
            label={mode === 'setPassword' ? auth.fields.newPassword : auth.fields.password}
            required
            hint={isNewPassword ? passwordHint : undefined}
          >
            <Input
              name="password"
              type="password"
              // The right hint matters: browsers offer to generate a strong password
              // on new-password and to fill a saved one on current-password.
              autoComplete={isNewPassword ? 'new-password' : 'current-password'}
              minLength={isNewPassword ? MIN_PASSWORD_LENGTH : undefined}
              dir="ltr"
              className="text-start"
            />
          </Field>
        )}

        {mode === 'setPassword' && (
          <Field label={auth.fields.confirmPassword} required>
            <Input
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              dir="ltr"
              className="text-start"
            />
          </Field>
        )}

        {state.status === 'error' && <Alert tone="error">{state.message}</Alert>}

        <Button type="submit" size="lg" block disabled={isPending}>
          {isPending ? copy.pending : copy.submit}
        </Button>
      </form>

      {mode === 'signIn' && (
        <p className="mt-5 text-center text-sm">
          <Link
            className="text-muted-foreground hover:text-primary underline underline-offset-4"
            href={localePath(locale, '/forgot-password')}
          >
            {auth.forgotPassword}
          </Link>
        </p>
      )}

      {footer !== null && (
        <p className="text-muted-foreground border-border mt-7 border-t pt-6 text-center text-sm">
          {footer.footerPrompt}{' '}
          <Link
            className="text-primary font-semibold underline underline-offset-2"
            href={footer.href}
          >
            {footer.footerLink}
          </Link>
        </p>
      )}
    </Card>
  );
}
