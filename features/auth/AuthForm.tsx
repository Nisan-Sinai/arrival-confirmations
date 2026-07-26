'use client';

import Link from 'next/link';
import { useActionState, useId } from 'react';

import type { AuthFormState } from '@/app/actions/auth';

/**
 * Shared shell for sign-in and sign-up (§8, §9).
 *
 * One component for both because the two forms differ only in their labels and the
 * action they post to. Keeping them identical is also a security property: a sign-up
 * page that looked or behaved differently from sign-in would give away which
 * addresses already hold an account.
 */

const INITIAL: AuthFormState = { status: 'idle', message: '' };

interface AuthFormProps {
  readonly action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  readonly title: string;
  readonly submitLabel: string;
  readonly pendingLabel: string;
  readonly footerPrompt: string;
  readonly footerHref: string;
  readonly footerLinkLabel: string;
  /** Sign-up only; drives the autocomplete hint and the minimum length note. */
  readonly isRegistration?: boolean;
  /** Password reset: the address is all we can ask for before the link is followed. */
  readonly emailOnly?: boolean;
}

export function AuthForm({
  action,
  title,
  submitLabel,
  pendingLabel,
  footerPrompt,
  footerHref,
  footerLinkLabel,
  isRegistration = false,
  emailOnly = false,
}: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, INITIAL);
  const formId = useId();

  return (
    <section className="bg-card mx-auto w-full max-w-md rounded-2xl border p-6 sm:p-8">
      <h1 className="text-primary text-center font-[family-name:var(--font-display)] text-2xl font-bold">
        {title}
      </h1>

      <form action={formAction} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor={`${formId}-email`} className="block text-sm font-semibold">
            אימייל
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            dir="ltr"
            className="border-input mt-1.5 w-full rounded-lg border px-3 py-2.5 text-base"
          />
        </div>

        {!emailOnly && (
          <div>
            <label htmlFor={`${formId}-password`} className="block text-sm font-semibold">
              סיסמה
            </label>
            <input
              id={`${formId}-password`}
              name="password"
              type="password"
              required
              // The right hint matters: browsers offer to generate a strong password on
              // new-password and to fill a saved one on current-password.
              autoComplete={isRegistration ? 'new-password' : 'current-password'}
              minLength={isRegistration ? 10 : undefined}
              dir="ltr"
              className="border-input mt-1.5 w-full rounded-lg border px-3 py-2.5 text-base"
            />
            {isRegistration && (
              <p className="text-muted-foreground mt-1.5 text-sm">לפחות 10 תווים</p>
            )}
          </div>
        )}

        {state.status !== 'idle' && (
          <p
            role="alert"
            className={`text-center text-sm ${state.status === 'sent' ? 'text-success' : 'text-destructive'}`}
          >
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground w-full rounded-lg px-6 py-3 text-base font-semibold disabled:opacity-60"
        >
          {isPending ? pendingLabel : submitLabel}
        </button>
      </form>

      {!isRegistration && !emailOnly && (
        <p className="mt-4 text-center text-sm">
          <Link
            className="text-muted-foreground hover:text-primary underline underline-offset-4"
            href="/forgot-password"
          >
            שכחתי סיסמה
          </Link>
        </p>
      )}

      <p className="text-muted-foreground mt-6 text-center text-sm">
        {footerPrompt}{' '}
        <Link className="text-primary font-semibold underline underline-offset-2" href={footerHref}>
          {footerLinkLabel}
        </Link>
      </p>
    </section>
  );
}
