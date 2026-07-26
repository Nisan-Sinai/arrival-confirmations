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
  readonly status: 'idle' | 'error';
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

export async function signOutAction(): Promise<void> {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
