import type { Metadata } from 'next';

import { getDictionary } from '@/config/dictionary';
import { AuthCallbackPageBody } from '@/features/auth/AuthCallbackPageBody';

export const metadata: Metadata = {
  title: getDictionary('en').auth.callback.subtitle,
  robots: { index: false, follow: false },
};

// A one-time credential is in the URL; nothing about this response may be cached.
export const dynamic = 'force-dynamic';

export default async function EnglishAuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <AuthCallbackPageBody locale="en" params={params} />;
}
