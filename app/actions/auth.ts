'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getDictionary } from '@/config/dictionary';
import { defaultLocale, isLocale, localePath, type Locale } from '@/lib/i18n';
import { createUserClient } from '@/lib/server/supabase';

export interface AuthFormState {
  readonly status: 'idle' | 'error' | 'sent';
  readonly message: string;
  readonly email?: string;
}

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

const MIN_PASSWORD_LENGTH = 10;
const echo = (value: FormDataEntryValue | null): string => (typeof value === 'string' ? value : '');

function localeOf(formData: FormData): Locale {
  const value = formData.get('locale');
  return typeof value === 'string' && isLocale(value) ? value : defaultLocale;
}

export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = localeOf(formData);
  const { auth } = getDictionary(locale);
  const email = formData.get('email');
  const password = formData.get('password');

  if (!isValidEmail(email) || typeof password !== 'string' || password === '') {
    return { status: 'error', message: auth.errors.loginFailed, email: echo(email) };
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { status: 'error', message: auth.errors.loginFailed, email };

  revalidatePath('/', 'layout');
  redirect(localePath(locale, '/dashboard'));
}

export async function signUpAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = localeOf(formData);
  const { auth } = getDictionary(locale);
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

  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}${localePath(locale, '/auth/callback')}`,
    },
  });

  if (error) return { status: 'sent', message: auth.sent.signupMaybe, email };
  if (data.session === null) {
    return { status: 'sent', message: auth.sent.signupConfirm, email };
  }

  revalidatePath('/', 'layout');
  redirect(localePath(locale, '/dashboard'));
}

export async function requestPasswordResetAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = localeOf(formData);
  const { auth } = getDictionary(locale);
  const email = formData.get('email');
  if (!isValidEmail(email)) {
    return { status: 'error', message: auth.errors.invalidEmail, email: echo(email) };
  }

  const supabase = await createUserClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}${localePath(locale, '/auth/callback')}?next=${localePath(locale, '/reset-password')}`,
  });
  return { status: 'sent', message: auth.sent.resetLink };
}

export async function updatePasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = localeOf(formData);
  const { auth } = getDictionary(locale);
  const password = formData.get('password');
  const confirmation = formData.get('passwordConfirmation');

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return {
      status: 'error',
      message: auth.errors.passwordTooShort.replace('{min}', String(MIN_PASSWORD_LENGTH)),
    };
  }
  if (password !== confirmation) {
    return { status: 'error', message: auth.errors.passwordsMismatch };
  }

  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) return { status: 'error', message: auth.errors.linkExpired };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: 'error', message: auth.errors.linkExpired };

  revalidatePath('/', 'layout');
  redirect(localePath(locale, '/dashboard'));
}

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect(localePath(locale, '/'));
}
