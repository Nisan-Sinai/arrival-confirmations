import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

/**
 * Without this, Turbopack walks up the filesystem looking for a lockfile and can
 * settle on one outside the project — a stray `package-lock.json` in the user's home
 * directory, for instance — which changes how modules resolve. Pinning the root here
 * makes the build identical on a developer machine, in CI, and on Vercel.
 */
const projectRoot = fileURLToPath(new URL('.', import.meta.url));

const isDev = process.env.NODE_ENV === 'development';

/**
 * The Supabase origin, so `connect-src` can name it exactly rather than opening the
 * directive to https: wholesale. Falls back to nothing when the variable is absent —
 * a build without it has no Supabase to reach anyway, and a literal 'undefined' in a
 * CSP is worse than a missing source.
 */
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin;
  } catch {
    return '';
  }
})();

/**
 * Content Security Policy (§4.9).
 *
 * `'unsafe-inline'` on script-src is deliberate and is the one directive here that is
 * weaker than it looks. Next.js bootstraps the App Router from inline scripts, and the
 * alternative — a per-request nonce — forces every route to render dynamically,
 * including the landing page and the legal pages that are currently static. On a
 * product whose entire premise is fitting inside the Vercel free tier, that is a real
 * cost. The XSS surface it leaves is narrow: guest-supplied text is escaped by React,
 * and the host's own URL fields are restricted to https:// in both the action and a
 * CHECK constraint. There is exactly one `dangerouslySetInnerHTML` in the application
 * — the JSON-LD block in `app/page.tsx`, whose input is a frozen literal from config
 * with no request data anywhere near it.
 *
 * Everything else is closed. `object-src 'none'` and `base-uri 'self'` remove the two
 * classic ways to turn an injected tag into navigation, and `frame-ancestors 'none'`
 * is why the separate X-Frame-Options header below is only a fallback for old agents.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // Turbopack's dev client evaluates its HMR payload; production has no such need.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  // Tailwind emits a stylesheet, but React still injects style attributes inline.
  "style-src 'self' 'unsafe-inline'",
  // next/font self-hosts every face at build time — no external font CDN is used.
  "font-src 'self'",
  "img-src 'self' data: blob:",
  `connect-src 'self'${supabaseOrigin === '' ? '' : ` ${supabaseOrigin}`}${isDev ? ' ws: wss:' : ''}`,
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  // The invitation is a page, not an app shell; nothing here should ever be a frame.
  "frame-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  // An invitation carries names, a venue and a phone number. Framing it is the setup
  // for a clickjack, and there is no legitimate reason to embed one anywhere.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // The public_id *is* the credential (§4.2), so it must not travel in a Referer to
  // Waze or Google Maps when a guest taps through to navigation.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  // A leaked stack trace is an information disclosure (§13).
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  /**
   * The share images read three TTFs off the filesystem at render time. Nothing
   * `import`s those files, so Next's tracer has no reason to believe they are needed
   * and would deploy the route without them — a failure that only shows up in
   * production, as a 500 on the one request a WhatsApp preview makes. Naming them
   * here is what puts them in the bundle.
   */
  outputFileTracingIncludes: {
    '/opengraph-image': ['./assets/fonts/*.ttf'],
    '/e/[publicId]/opengraph-image': ['./assets/fonts/*.ttf'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
