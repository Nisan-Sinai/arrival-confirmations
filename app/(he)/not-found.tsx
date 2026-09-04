import type { Metadata } from 'next';

import { NotFoundContent } from '@/features/layout/NotFoundContent';

export const metadata: Metadata = {
  title: { absolute: 'הדף לא נמצא' },
  robots: { index: false, follow: false },
};

/**
 * The 404 for a `notFound()` thrown inside the Hebrew route tree. It renders through
 * `app/(he)`'s root layout, so it needs the content alone — the document shell is
 * already around it.
 */
export default function NotFound() {
  return <NotFoundContent />;
}
