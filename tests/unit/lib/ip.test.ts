import { describe, expect, it } from 'vitest';

import { resolveClientIpHash, selectTrustedAddress, UNRESOLVED_IP_SENTINEL } from '@/lib/server/ip';
import { hashIdentity, TOKEN_PURPOSES } from '@/lib/server/tokens';

const headersOf = (init: Record<string, string>): Headers => new Headers(init);

describe('selectTrustedAddress', () => {
  it('prefers the platform header over anything the caller sent', () => {
    const headers = headersOf({
      'x-real-ip': '203.0.113.10',
      'x-forwarded-for': '198.51.100.99',
    });
    expect(selectTrustedAddress(headers)).toBe('203.0.113.10');
  });

  it('takes the RIGHTMOST x-forwarded-for entry, not the leftmost', () => {
    // This is the whole point of §4.8. Everything left of the last entry was written
    // by the caller; only the last was appended by the proxy. Reading entries[0] —
    // "the client" by the header's own semantics — reads the forgeable part.
    const headers = headersOf({
      'x-forwarded-for': '10.0.0.1, 172.16.0.1, 203.0.113.77',
    });
    expect(selectTrustedAddress(headers)).toBe('203.0.113.77');
  });

  it('ignores a forged entry a caller prepends', () => {
    const genuine = headersOf({ 'x-forwarded-for': '203.0.113.77' });
    const forged = headersOf({ 'x-forwarded-for': 'not-an-ip, 203.0.113.77' });
    expect(selectTrustedAddress(forged)).toBe(selectTrustedAddress(genuine));
  });

  it('cannot be given a new identity by varying the forged prefix', () => {
    const attempts = ['1.1.1.1', '2.2.2.2', 'garbage', ''].map((forgery) =>
      selectTrustedAddress(headersOf({ 'x-forwarded-for': `${forgery}, 203.0.113.77` })),
    );
    expect(new Set(attempts)).toEqual(new Set(['203.0.113.77']));
  });

  it('strips a port from an IPv4 entry', () => {
    expect(selectTrustedAddress(headersOf({ 'x-real-ip': '203.0.113.10:54321' }))).toBe(
      '203.0.113.10',
    );
  });

  it('unwraps a bracketed IPv6 address with a port', () => {
    expect(selectTrustedAddress(headersOf({ 'x-real-ip': '[2001:db8::1]:443' }))).toBe(
      '2001:db8::1',
    );
  });

  it('accepts a bare IPv6 address', () => {
    expect(selectTrustedAddress(headersOf({ 'x-real-ip': '2001:db8::1' }))).toBe('2001:db8::1');
  });

  it.each([
    ['no headers at all', {}],
    ['a malformed address', { 'x-real-ip': 'definitely-not-an-ip' }],
    ['an empty header', { 'x-forwarded-for': '' }],
    ['only separators', { 'x-forwarded-for': ' , , ' }],
    ['an out-of-range octet', { 'x-real-ip': '999.999.999.999' }],
    ['an absurdly long value', { 'x-real-ip': '1'.repeat(200) }],
  ])('returns null for %s', (_label, init) => {
    expect(selectTrustedAddress(headersOf(init))).toBeNull();
  });

  it('falls back to x-forwarded-for when the platform header is malformed', () => {
    const headers = headersOf({
      'x-real-ip': 'garbage',
      'x-forwarded-for': '203.0.113.77',
    });
    expect(selectTrustedAddress(headers)).toBe('203.0.113.77');
  });
});

describe('resolveClientIpHash', () => {
  it('never returns the address itself', () => {
    const address = '203.0.113.77';
    const resolved = resolveClientIpHash(headersOf({ 'x-real-ip': address }));
    // §4.8: the raw IP must not be stored or logged. There is no accessor that
    // returns it, so this asserts the shape of the whole result.
    expect(JSON.stringify(resolved)).not.toContain(address);
    expect(resolved.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('marks a resolved address as trusted', () => {
    expect(resolveClientIpHash(headersOf({ 'x-real-ip': '203.0.113.77' })).trusted).toBe(true);
  });

  it('gives the same visitor the same bucket across requests', () => {
    const first = resolveClientIpHash(headersOf({ 'x-real-ip': '203.0.113.77' }));
    const second = resolveClientIpHash(headersOf({ 'x-real-ip': '203.0.113.77' }));
    expect(first.hash).toBe(second.hash);
  });

  it('gives different visitors different buckets', () => {
    expect(resolveClientIpHash(headersOf({ 'x-real-ip': '203.0.113.77' })).hash).not.toBe(
      resolveClientIpHash(headersOf({ 'x-real-ip': '203.0.113.78' })).hash,
    );
  });

  it('treats IPv6 case-insensitively, so one visitor is not two buckets', () => {
    expect(resolveClientIpHash(headersOf({ 'x-real-ip': '2001:DB8::1' })).hash).toBe(
      resolveClientIpHash(headersOf({ 'x-real-ip': '2001:db8::1' })).hash,
    );
  });

  it('falls back to one deterministic shared bucket, not a random one', () => {
    // A random fallback would hand every unresolvable request its own bucket, which
    // is precisely the bypass the resolver exists to close.
    const first = resolveClientIpHash(headersOf({}));
    const second = resolveClientIpHash(headersOf({ 'x-real-ip': 'garbage' }));
    expect(first.trusted).toBe(false);
    expect(first.hash).toBe(second.hash);
    expect(first.hash).toBe(hashIdentity(UNRESOLVED_IP_SENTINEL, TOKEN_PURPOSES.rateLimit));
  });

  it('keeps the fallback bucket distinct from any real address', () => {
    expect(resolveClientIpHash(headersOf({})).hash).not.toBe(
      resolveClientIpHash(headersOf({ 'x-real-ip': '203.0.113.77' })).hash,
    );
  });
});
