import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: { absolute: 'Page not found' },
  robots: { index: false, follow: false },
};

/**
 * Unmatched `/en/*` paths otherwise fall through to the global Hebrew 404 because the
 * application has two independent root layouts. A catch-all keeps those misses inside
 * the English tree, where `not-found.tsx` can render the matching language and links.
 */
export default function UnknownEnglishPath() {
  notFound();
}
