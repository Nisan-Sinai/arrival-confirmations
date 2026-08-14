import type { Metadata } from 'next';

import { getDictionary } from '@/config/dictionary';
import { SignInPageBody } from '@/features/auth/SignInPageBody';

export const metadata: Metadata = {
  title: getDictionary('he').auth.modes.signIn.title,
  // §12: account pages have no business in a search index.
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <SignInPageBody locale="he" error={error} />;
}
