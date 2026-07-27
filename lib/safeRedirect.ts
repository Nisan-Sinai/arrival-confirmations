/**
 * Where an auth callback is allowed to send the browser next (§4.4).
 *
 * `/auth/callback` accepts a `next` parameter so a recovery mail can land the host on
 * `/reset-password` rather than the dashboard. That parameter is attacker-supplied by
 * construction — the point of a callback URL is that somebody else built the link —
 * and a callback that follows an absolute URL is the classic way a trusted domain
 * becomes a phishing hop: the victim checks the domain, sees the real one, and is
 * bounced somewhere else the moment they authenticate.
 *
 * This lives in `lib/` rather than beside the handler because a `route.ts` may only
 * export HTTP methods — an extra export there fails the build — and a rule this
 * consequential should not be reachable only through a Next.js request.
 */
export const DEFAULT_REDIRECT = '/dashboard';

export function safeNextPath(raw: string | null | undefined): string {
  if (raw === null || raw === undefined || raw === '') return DEFAULT_REDIRECT;

  /**
   * A single leading slash and nothing that turns into an origin.
   *
   * `//evil.example` is the case a bare `startsWith('/')` admits: it is a
   * protocol-relative URL, it begins with a slash, and it navigates straight off the
   * site. `/\evil.example` is the same trick for agents that normalise a backslash.
   */
  if (!raw.startsWith('/')) return DEFAULT_REDIRECT;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return DEFAULT_REDIRECT;

  return raw;
}
