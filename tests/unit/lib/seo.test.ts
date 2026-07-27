import { describe, expect, it, vi } from 'vitest';

/**
 * The canonical shape of the site (§12).
 *
 * The module reads `clientEnv` at import time, so each case loads its own instance
 * against a stubbed environment. That is also the only way to reach the trailing-slash
 * branch, which exists because `NEXT_PUBLIC_SITE_URL` is typed as a URL and a URL with
 * a trailing slash is perfectly valid — `https://example.test/` plus `/privacy` would
 * otherwise emit `https://example.test//privacy` into the sitemap, which Google treats
 * as a different page from the one the site actually serves.
 */
async function loadSeo(siteUrl: string) {
  vi.resetModules();
  vi.doMock('@/lib/env.client', () => ({ clientEnv: { NEXT_PUBLIC_SITE_URL: siteUrl } }));
  return import('@/lib/seo');
}

describe('SITE_ORIGIN', () => {
  it('uses the configured site URL as-is', async () => {
    const { SITE_ORIGIN } = await loadSeo('https://example.test');
    expect(SITE_ORIGIN).toBe('https://example.test');
  });

  it('strips a trailing slash so joined paths never double up', async () => {
    const { SITE_ORIGIN, absoluteUrl } = await loadSeo('https://example.test/');
    expect(SITE_ORIGIN).toBe('https://example.test');
    expect(absoluteUrl('/privacy')).toBe('https://example.test/privacy');
  });

  it('strips repeated trailing slashes', async () => {
    const { SITE_ORIGIN } = await loadSeo('https://example.test///');
    expect(SITE_ORIGIN).toBe('https://example.test');
  });
});

describe('absoluteUrl', () => {
  it('joins a rooted path', async () => {
    const { absoluteUrl } = await loadSeo('https://example.test');
    expect(absoluteUrl('/sitemap.xml')).toBe('https://example.test/sitemap.xml');
  });

  it('adds the missing separator for a bare path', async () => {
    const { absoluteUrl } = await loadSeo('https://example.test');
    expect(absoluteUrl('sitemap.xml')).toBe('https://example.test/sitemap.xml');
  });
});

describe('the crawlable surface', () => {
  it('offers exactly the three pages that carry no personal data', async () => {
    const { INDEXABLE_PATHS } = await loadSeo('https://example.test');
    expect([...INDEXABLE_PATHS]).toEqual(['/', '/privacy', '/accessibility']);
  });

  /**
   * The assertion that matters, and the reason this file exists. An invitation URL is
   * its own access control (§4.2); a crawler holding one is a crawler that can publish
   * a family's names, venue and phone number into a search index. If a refactor ever
   * drops this prefix, the failure is silent everywhere else.
   */
  it('closes the invitation namespace to crawlers', async () => {
    const { DISALLOWED_PATHS } = await loadSeo('https://example.test');
    expect(DISALLOWED_PATHS).toContain('/e/');
  });

  it('closes every authenticated route', async () => {
    const { DISALLOWED_PATHS } = await loadSeo('https://example.test');
    expect([...DISALLOWED_PATHS]).toEqual(
      expect.arrayContaining([
        '/dashboard/',
        '/login',
        '/signup',
        '/forgot-password',
        '/reset-password',
        '/auth/',
      ]),
    );
  });

  /** A path in both lists would be a contradiction shipped to robots.txt. */
  it('never both allows and disallows the same path', async () => {
    const { INDEXABLE_PATHS, DISALLOWED_PATHS } = await loadSeo('https://example.test');
    const overlap = INDEXABLE_PATHS.filter((path) =>
      DISALLOWED_PATHS.some((blocked) => path.startsWith(blocked)),
    );
    expect(overlap).toEqual([]);
  });
});
