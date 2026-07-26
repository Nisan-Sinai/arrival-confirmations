import 'server-only';

import { hashIdentity, TOKEN_PURPOSES } from '@/lib/server/tokens';

/**
 * Trusted client-IP resolution (§4.8).
 *
 * The threat is straightforward: `X-Forwarded-For` is a request header, so a caller
 * can put anything in it. Trusting it blindly hands every attacker an unlimited
 * supply of rate-limit identities — they simply vary the header and the limiter
 * counts each forgery as a new visitor.
 *
 * What makes it tractable is that this application runs behind exactly one proxy
 * layer. Vercel terminates the connection, discards whatever `X-Forwarded-For` the
 * client sent, and rewrites it with the real peer address appended last. So the
 * *rightmost* entry is the one Vercel observed and the only one that is not
 * attacker-controlled. Reading the leftmost entry — the common mistake, since that
 * is "the client" in the header's own semantics — reads exactly the forgeable part.
 *
 * Trust assumptions, restated for SECURITY.md:
 *   1. The application is only reachable through the platform proxy. If it were
 *      also exposed directly, the rightmost entry would be the attacker's too.
 *   2. The proxy appends rather than replaces, and does not permit spoofing of the
 *      entry it adds.
 *   3. When no trusted address can be established, requests share one deterministic
 *      bucket. That throttles an anonymous flood as a group rather than failing open.
 */

/** Header set by the platform with the address it actually observed. */
const PLATFORM_IP_HEADERS = ['x-real-ip', 'x-vercel-forwarded-for'] as const;

/**
 * The shared bucket for requests whose origin cannot be established (§4.8
 * "deterministic fallback"). Not a random value: a random one would give every such
 * request its own bucket, which is the failure mode this guards against.
 */
export const UNRESOLVED_IP_SENTINEL = 'unresolved-client-ip';

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
/** Deliberately permissive: the value is hashed, never parsed or routed to. */
const IPV6 = /^[0-9a-f:]+$/i;

export interface ResolvedClientIp {
  /** True when a trusted address was established; false when the fallback applies. */
  readonly trusted: boolean;
  /** Peppered SHA-256. §4.8 forbids storing or logging the address itself. */
  readonly hash: string;
}

function isPlausibleAddress(value: string): boolean {
  if (value.length === 0 || value.length > 45) return false;
  return IPV4.test(value) || (value.includes(':') && IPV6.test(value));
}

/**
 * Strips the decoration proxies add: a `[::1]:443` bracketed IPv6 with a port, or an
 * IPv4 with a trailing port. A malformed value falls through and fails validation
 * rather than being repaired into something plausible.
 */
function normalizeCandidate(raw: string): string {
  const value = raw.trim();
  if (value.startsWith('[')) {
    const close = value.indexOf(']');
    return close === -1 ? value : value.slice(1, close);
  }
  // Exactly one colon means IPv4:port; several means a bare IPv6, which keeps its colons.
  const firstColon = value.indexOf(':');
  if (firstColon !== -1 && value.indexOf(':', firstColon + 1) === -1) {
    return value.slice(0, firstColon);
  }
  return value;
}

/**
 * Extracts the address the platform observed, or null when nothing trustworthy is
 * present.
 *
 * Exported for the unit tests, which need to assert the selection rule directly —
 * that the rightmost `X-Forwarded-For` entry wins, not the leftmost.
 */
export function selectTrustedAddress(headers: Headers): string | null {
  for (const header of PLATFORM_IP_HEADERS) {
    const value = headers.get(header);
    if (value === null) continue;
    const candidate = normalizeCandidate(value);
    if (isPlausibleAddress(candidate)) return candidate;
  }

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded === null) return null;

  const entries = forwarded.split(',');
  // Rightmost first: everything to its left was supplied by the caller.
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const candidate = normalizeCandidate(entries[index]!);
    if (isPlausibleAddress(candidate)) return candidate;
  }
  return null;
}

/**
 * Resolves a request to a rate-limit identity.
 *
 * Returns only a hash. There is no variant that returns the address, because the
 * absence of one is what makes "never log a raw IP" enforceable by review rather
 * than by discipline.
 */
export function resolveClientIpHash(headers: Headers): ResolvedClientIp {
  const address = selectTrustedAddress(headers);
  if (address === null) {
    return {
      trusted: false,
      hash: hashIdentity(UNRESOLVED_IP_SENTINEL, TOKEN_PURPOSES.rateLimit),
    };
  }
  return {
    trusted: true,
    hash: hashIdentity(address.toLowerCase(), TOKEN_PURPOSES.rateLimit),
  };
}
