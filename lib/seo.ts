import { clientEnv } from '@/lib/env.client';

/** Origin without a trailing slash, so joined paths never double up. */
export const SITE_ORIGIN = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');

/** Public pages that carry no personal data and are useful in search results. */
export const INDEXABLE_PATHS = ['/', '/pricing', '/privacy', '/accessibility'] as const;

/** Private, authenticated or invitation paths that crawlers must never index. */
export const DISALLOWED_PATHS = [
  '/e/',
  '/dashboard/',
  '/admin/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/',
] as const;

export const GOOGLE_SITE_VERIFICATION = 'E28NaBeiOIjkaklYu2ZeTrE9hEni9yBGcYeyGkrZ7MQ';

export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}
