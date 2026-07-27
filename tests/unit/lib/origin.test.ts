import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Resolving the origin a request actually arrived on.
 *
 * The bug this guards: the invitation link a host copies from the dashboard used to be
 * built from `NEXT_PUBLIC_SITE_URL`, a single build-time constant. A host working on a
 * Vercel preview deployment was handed a production URL for an event that only exists
 * on the preview — a link that 404s, discovered when a guest says so.
 *
 * `next/headers` is stubbed because it can only be called inside a request scope. The
 * substitution is narrow: the mock returns a real `Headers` object, so the code under
 * test does its own parsing exactly as it would in production.
 */
const headerStore = { current: new Headers() };

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(headerStore.current),
}));

vi.mock('@/lib/env.client', () => ({
  clientEnv: { NEXT_PUBLIC_SITE_URL: 'https://configured.example' },
}));

const { resolveRequestOrigin } = await import('@/lib/server/origin');

describe('resolveRequestOrigin', () => {
  beforeEach(() => {
    headerStore.current = new Headers();
  });

  it('prefers the forwarded host, which is where the browser actually is', async () => {
    headerStore.current = new Headers({
      'x-forwarded-host': 'preview-abc123.vercel.app',
      'x-forwarded-proto': 'https',
      host: 'internal-origin.vercel.app',
    });
    expect(await resolveRequestOrigin()).toBe('https://preview-abc123.vercel.app');
  });

  it('falls back to the Host header when nothing forwarded one', async () => {
    headerStore.current = new Headers({ host: 'localhost:3000', 'x-forwarded-proto': 'http' });
    expect(await resolveRequestOrigin()).toBe('http://localhost:3000');
  });

  it('assumes https when no protocol was forwarded', async () => {
    headerStore.current = new Headers({ host: 'example.test' });
    expect(await resolveRequestOrigin()).toBe('https://example.test');
  });

  /**
   * Several proxies in a chain each append to these headers, so the value arrives as
   * a comma-separated list. Using it whole produces `https://a.example, b.example`,
   * which is not a URL at all — and the entry closest to the client is the first.
   */
  it('takes the first entry when proxies have chained the header', async () => {
    headerStore.current = new Headers({
      'x-forwarded-host': 'first.example, second.example',
      'x-forwarded-proto': 'https, http',
    });
    expect(await resolveRequestOrigin()).toBe('https://first.example');
  });

  it('falls back to the configured site URL when there is no host at all', async () => {
    expect(await resolveRequestOrigin()).toBe('https://configured.example');
  });

  /**
   * A chain whose first entry is blank. `https://` with nothing after it is not a URL,
   * and a copy button that produced one would hand the host a link that goes nowhere —
   * so the configured site URL is the safer answer than a syntactically broken origin.
   */
  it('falls back rather than emitting a protocol with an empty authority', async () => {
    headerStore.current = new Headers({ 'x-forwarded-host': ', second.example' });
    expect(await resolveRequestOrigin()).toBe('https://configured.example');
  });

  it('falls back when the header is present but empty', async () => {
    headerStore.current = new Headers({ 'x-forwarded-host': '' });
    expect(await resolveRequestOrigin()).toBe('https://configured.example');
  });
});
