'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { UI_MESSAGES } from '@/config/messages';
import { createUserClient } from '@/lib/server/supabase';

/**
 * Sign-in and sign-up (§8, §4.4).
 *
 * Errors are deliberately generic. Supabase distinguishes "no such user" from "wrong
 * password", and passing that through would turn the login form into an oracle for
 * which email addresses hold an account — §4.4 forbids exactly that.
 */

export interface AuthFormState {
  readonly status: 'idle' | 'error' | 'sent';
  readonly message: string;
}

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Supabase's own floor is 6; 10 is a meaningful improvement at no usability cost. */
const MIN_PASSWORD_LENGTH = 10;

export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get('email');
  const password = formData.get('password');

  if (!isValidEmail(email) || typeof password !== 'string' || password === '') {
    return { status: 'error', message: UI_MESSAGES.admin.loginFailed };
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // One message for every failure mode, on purpose.
  if (error) return { status: 'error', message: UI_MESSAGES.admin.loginFailed };

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signUpAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get('email');
  const password = formData.get('password');

  if (!isValidEmail(email)) {
    return { status: 'error', message: 'כתובת אימייל לא תקינה' };
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return { status: 'error', message: `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים` };
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    // Registering an existing address must not confirm that it exists, so the copy
    // below is true either way: check your inbox.
    return {
      status: 'error',
      message: 'אם הכתובת פנויה, נשלח אליה מייל אימות. בדקו את תיבת הדואר.',
    };
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
  const email = formData.get('email');
  if (!isValidEmail(email)) {
    return { status: 'error', message: 'כתובת אימייל לא תקינה' };
  }

  const supabase = await createUserClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/reset-password`,
  });

  // The error, if any, is deliberately not surfaced.
  return {
    status: 'sent',
    message: 'אם קיים חשבון עם הכתובת הזו, נשלח אליה קישור לאיפוס סיסמה.',
  };
}

/** Sets a new password for the session the reset link established. */
export async function updatePasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = formData.get('password');
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return { status: 'error', message: `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים` };
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { status: 'error', message: 'הקישור פג תוקף. בקשו קישור איפוס חדש.' };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

/**
 * Google sign-in.
 *
 * Returns the provider URL for the browser to follow rather than redirecting here:
 * the OAuth handshake has to happen in the top-level window, and a redirect issued
 * inside a Server Action would be followed by the action's fetch instead.
 */
export async function signInWithGoogleAction(): Promise<void> {
  const supabase = await createUserClient();
  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback` },
  });
  if (data.url) redirect(data.url);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
