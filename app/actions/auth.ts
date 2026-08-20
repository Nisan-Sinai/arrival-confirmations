'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getDictionary } from '@/config/dictionary';
import { defaultLocale, isLocale, localePath, type Locale } from '@/lib/i18n';
import { resolveClientIpHash } from '@/lib/server/ip';
import { createPrivilegedClient, createUserClient } from '@/lib/server/supabase';
import { hashIdentity, TOKEN_PURPOSES } from '@/lib/server/tokens';

/**
 * Sign-in, sign-up and password recovery (§8, §4.4).
 *
 * Errors are deliberately generic. Supabase distinguishes "no such user" from "wrong
 * password", and passing that through would turn the login form into an oracle for
 * which email addresses hold an account — §4.4 forbids exactly that.
 */

export interface AuthFormState {
  readonly status: 'idle' | 'error' | 'sent';
  readonly message: string;
  /**
   * The address the user typed, echoed back so a rejected submission does not empty
   * the field. React resets uncontrolled inputs once a form action resolves, so
   * without this the user re-types their email after every failed attempt — which on
   * a login form is precisely when they are least patient.
   */
  readonly email?: string;
}

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** A 12-character application floor raises the baseline above Supabase's legacy default. */
const MIN_PASSWORD_LENGTH = 12;

const AUTH_RATE_LIMITS = {
  'sign-in': { limit: 10, windowSeconds: 300 },
  'sign-up': { limit: 5, windowSeconds: 3600 },
  'password-reset': { limit: 5, windowSeconds: 900 },
} as const;

type AuthRateLimitScope = keyof typeof AUTH_RATE_LIMITS;

/** Never echoed unless it is safe to: a password is not put back into the DOM. */
const echo = (value: FormDataEntryValue | null): string => (typeof value === 'string' ? value : '');

/**
 * The locale the form was rendered under, carried in a hidden field. It decides only
 * which language the reply is written in and where the mail links land — never where a
 * successful sign-in goes, which is the (Hebrew) application at `/dashboard`.
 */
function localeOf(formData: FormData): Locale {
  const value = formData.get('locale');
  return typeof value === 'string' && isLocale(value) ? value : defaultLocale;
}

/**
 * Distributed, fail-closed throttling for public auth operations.
 *
 * Two independent hashed buckets are consumed for every provider call: one for the
 * source IP and one for the account identifier. That stops a single source from
 * spraying many addresses and also stops a single account from being attacked by
 * rotating source addresses. No raw IP or email is stored in the limiter table.
 */
async function allowAuthAttempt(scope: AuthRateLimitScope, email: string): Promise<boolean> {
  const { limit, windowSeconds } = AUTH_RATE_LIMITS[scope];
  const { hash: ipHash } = resolveClientIpHash(await headers());
  const emailHash = hashIdentity(email.trim().toLocaleLowerCase('en-US'), TOKEN_PURPOSES.rateLimit);
  const db = createPrivilegedClient();

  const [ipResult, accountResult] = await Promise.all([
    db.rpc('consume_rate_limit', {
      p_bucket_key: `auth:${scope}:ip:${ipHash}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    }),
    db.rpc('consume_rate_limit', {
      p_bucket_key: `auth:${scope}:account:${emailHash}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    }),
  ]);

  if (ipResult.error !== null || accountResult.error !== null) return false;
  return ipResult.data?.[0]?.allowed === true && accountResult.data?.[0]?.allowed === true;
}

export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { auth, errors } = getDictionary(localeOf(formData));
  const email = formData.get('email');
  const password = formData.get('password');

  if (!isValidEmail(email) || typeof password !== 'string' || password === '') {
    return { status: 'error', message: auth.errors.loginFailed, email: echo(email) };
  }

  if (!(await allowAuthAttempt('sign-in', email))) {
    return { status: 'error', message: errors.genericBody, email };
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // One message for every provider failure mode, on purpose.
  if (error) {
    return { status: 'error', message: auth.errors.loginFailed, email };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signUpAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = localeOf(formData);
  const { auth, errors } = getDictionary(locale);
  const email = formData.get('email');
  const password = formData.get('password');

  if (!isValidEmail(email)) {
    return { status: 'error', message: auth.errors.invalidEmail, email: echo(email) };
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return {
      status: 'error',
      message: auth.errors.passwordTooShort.replace('{min}', String(MIN_PASSWORD_LENGTH)),
      email,
    };
  }

  if (!(await allowAuthAttempt('sign-up', email))) {
    return { status: 'error', message: errors.genericBody, email };
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Confirmation mail lands on the exchange route, not on a page that cannot spend
    // the code. Without this the link opens the site root and the account stays
    // unconfirmed with nothing on screen to say so. The reader's locale is kept so an
    // English sign-up is completed on the English side.
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}${localePath(locale, '/auth/callback')}`,
    },
  });

  if (error) {
    // Registering an existing address must not confirm that it exists, so the copy
    // below is true either way: check your inbox.
    return { status: 'sent', message: auth.sent.signupMaybe, email };
  }

  /**
   * When the project requires email confirmation, `signUp` succeeds with no session.
   * Redirecting to /dashboard here sent the user to a page the middleware immediately
   * bounced back to /login — the account had been created and the screen said nothing
   * about it. Branch on the session rather than on the absence of an error.
   */
  if (data.session === null) {
    return { status: 'sent', message: auth.sent.signupConfirm, email };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

/**
 * Password reset (§8 auth, §4.4).
 *
 * Always reports success, whether or not the address has an account. Saying "no such
 * user" would turn this form into the account-enumeration oracle the login page
 * refuses to be, and it is the easier of the two to overlook.
 */
export async function requestPasswordResetAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = localeOf(formData);
  const { auth, errors } = getDictionary(locale);
  const email = formData.get('email');
  if (!isValidEmail(email)) {
    return { status: 'error', message: auth.errors.invalidEmail, email: echo(email) };
  }

  if (!(await allowAuthAttempt('password-reset', email))) {
    return { status: 'error', message: errors.genericBody, email };
  }

  const supabase = await createUserClient();
  await supabase.auth.resetPasswordForEmail(email, {
    // Through the exchange route, not straight at /reset-password. The mail carries a
    // one-time code that has to be spent for a session to exist; a link that landed
    // on the form directly left the user on a page that could not save anything. Both
    // hops keep the reader's locale so the reset is completed on the same side.
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}${localePath(locale, '/auth/callback')}?next=${localePath(locale, '/reset-password')}`,
  });

  // The provider error, if any, is deliberately not surfaced.
  return { status: 'sent', message: auth.sent.resetLink };
}

/** Sets a new password for the session the reset link established. */
export async function updatePasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { auth } = getDictionary(localeOf(formData));
  const password = formData.get('password');
  const confirmation = formData.get('passwordConfirmation');

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return {
      status: 'error',
      message: auth.errors.passwordTooShort.replace('{min}', String(MIN_PASSWORD_LENGTH)),
    };
  }
  // Typed twice because there is nothing to compare against: the user cannot see the
  // value and cannot recover from a typo except by running the whole reset again.
  if (password !== confirmation) {
    return { status: 'error', message: auth.errors.passwordsMismatch };
  }

  const supabase = await createUserClient();

  // updateUser on a request with no recovery session silently targets nobody. Check
  // first, so an expired link says so instead of appearing to succeed.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) {
    return { status: 'error', message: auth.errors.linkExpired };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { status: 'error', message: auth.errors.linkExpired };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

/**
 * Google sign-in was removed here rather than wired up.
 *
 * It had no caller, no route to return to, and no line in PLAN.md asking for it — the
 * action existed, pointed at a `/auth/callback` that did not, and nothing rendered a
 * button for it. Shipping one now would mean shipping a control whose success depends
 * on a provider being enabled in the Supabase dashboard, which cannot be verified from
 * the repository. The exchange route it wanted does now exist and is used by password
 * recovery and email confirmation, so restoring OAuth later is a UI change alone.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
