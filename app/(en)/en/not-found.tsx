import type { Metadata } from 'next';

import { NotFoundContent } from '@/features/layout/NotFoundContent';

export const metadata: Metadata = {
  title: { absolute: 'Page not found' },
  robots: { index: false, follow: false },
};

/** The localized 404 rendered for misses inside the English route tree. */
export default function EnglishNotFound() {
  return <NotFoundContent locale="en" />;
}
