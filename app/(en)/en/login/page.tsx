import type { Metadata } from 'next';

import { getDictionary } from '@/config/dictionary';
import { SignInPageBody } from '@/features/auth/SignInPageBody';

export const metadata: Metadata = {
  title: getDictionary('en').auth.modes.signIn.title,
  robots: { index: false, follow: false },
};

export default async function EnglishLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <SignInPageBody locale="en" error={error} />;
}
