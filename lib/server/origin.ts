import 'server-only';

import { headers } from 'next/headers';

import { clientEnv } from '@/lib/env.client';

/**
 * The origin this request actually arrived on.
 *
 * Used to build the invitation link a host copies. NEXT_PUBLIC_SITE_URL is the wrong
 * source for that: it is a single build-time constant, so a host working on a Vercel
 * preview deployment would be handed a production URL for an event that only exists on
 * the preview. The forwarded headers are the only thing that knows where the browser
 * really is.
 *
 * These headers are set by the proxy in front of the app and are attacker-influenced
 * on a deployment without one. That is acceptable here and only here, because the
 * value is echoed back to the same user who sent it and is never used to authorise
 * anything, to sign anything, or to build a redirect. The configured site URL remains
 * the fallback, so a missing header degrades to today's behaviour rather than to an
 * empty string.
 */
export async function resolveRequestOrigin(): Promise<string> {
  const headerList = await headers();

  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  if (host === null || host === '') return clientEnv.NEXT_PUBLIC_SITE_URL;

  // A comma-separated chain means several proxies appended to it; the first entry is
  // the one closest to the client. `split` always yields at least one element, so the
  // index cannot be undefined and a `?? ''` here would be an unreachable branch.
  const firstHost = host.split(',')[0]!.trim();
  if (firstHost === '') return clientEnv.NEXT_PUBLIC_SITE_URL;

  const forwardedProtocol = headerList.get('x-forwarded-proto');
  const protocol = forwardedProtocol === null ? 'https' : forwardedProtocol.split(',')[0]!.trim();
  return `${protocol}://${firstHost}`;
}
