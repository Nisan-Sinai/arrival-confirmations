import { describe, expect, it, vi } from 'vitest';

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

describe('GOOGLE_SITE_VERIFICATION', () => {
  it('is present, so the Search Console property stays verified', async () => {
    const { GOOGLE_SITE_VERIFICATION } = await loadSeo('https://example.test');
    expect(GOOGLE_SITE_VERIFICATION).toMatch(/^[\w-]{40,50}$/);
  });
});

describe('the crawlable surface', () => {
  it('offers the public product, pricing and legal pages', async () => {
    const { INDEXABLE_PATHS } = await loadSeo('https://example.test');
    expect([...INDEXABLE_PATHS]).toEqual(['/', '/pricing', '/privacy', '/accessibility']);
  });

  it('closes the invitation namespace to crawlers', async () => {
    const { DISALLOWED_PATHS } = await loadSeo('https://example.test');
    expect(DISALLOWED_PATHS).toContain('/e/');
  });

  it('closes every authenticated route', async () => {
    const { DISALLOWED_PATHS } = await loadSeo('https://example.test');
    expect([...DISALLOWED_PATHS]).toEqual(
      expect.arrayContaining([
        '/dashboard/',
        '/admin/',
        '/login',
        '/signup',
        '/forgot-password',
        '/reset-password',
        '/auth/',
      ]),
    );
  });

  it('never both allows and disallows the same path', async () => {
    const { INDEXABLE_PATHS, DISALLOWED_PATHS } = await loadSeo('https://example.test');
    const overlap = INDEXABLE_PATHS.filter((path) =>
      DISALLOWED_PATHS.some((blocked) => path.startsWith(blocked)),
    );
    expect(overlap).toEqual([]);
  });
});
