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

describe('PUBLISHER_URL', () => {
  it('is an absolute https URL, because it is published as an entity claim', async () => {
    const { PUBLISHER_URL } = await loadSeo('https://example.test');
    expect(PUBLISHER_URL.startsWith('https://')).toBe(true);
    expect(() => new URL(PUBLISHER_URL)).not.toThrow();
  });

  it('points somewhere other than this site, or it asserts nothing', async () => {
    const { PUBLISHER_URL, SITE_ORIGIN } = await loadSeo('https://example.test');
    expect(PUBLISHER_URL).not.toBe(SITE_ORIGIN);
  });
});

describe('localeVariants', () => {
  it('gives the Hebrew route unprefixed and the English one under /en', async () => {
    const { localeVariants } = await loadSeo('https://example.test');
    expect(localeVariants('/login')).toEqual(['/login', '/en/login']);
  });

  it('keeps a directory path’s trailing slash, so a prefix rule cannot over-match', async () => {
    const { localeVariants } = await loadSeo('https://example.test');
    expect(localeVariants('/dashboard/')).toEqual(['/dashboard/', '/en/dashboard/']);
  });

  it('covers every locale the site declares', async () => {
    const { localeVariants } = await loadSeo('https://example.test');
    const { locales } = await import('@/lib/i18n');
    expect(localeVariants('/privacy')).toHaveLength(locales.length);
  });
});

describe('disallowedPaths', () => {
  it('closes the English sign-in pages, which a bare /login never covered', async () => {
    const { disallowedPaths } = await loadSeo('https://example.test');
    // The regression this function exists for: Disallow is a prefix match, so
    // '/login' left '/en/login' crawlable for as long as the English tree has shipped.
    expect(disallowedPaths()).toEqual(
      expect.arrayContaining([
        '/en/login',
        '/en/signup',
        '/en/forgot-password',
        '/en/reset-password',
        '/en/auth/',
      ]),
    );
  });

  it('still closes every Hebrew route it closed before', async () => {
    const { disallowedPaths, DISALLOWED_PATHS } = await loadSeo('https://example.test');
    expect(disallowedPaths()).toEqual(expect.arrayContaining([...DISALLOWED_PATHS]));
  });

  it('emits one rule per route per locale and no duplicates', async () => {
    const { disallowedPaths, DISALLOWED_PATHS } = await loadSeo('https://example.test');
    const { locales } = await import('@/lib/i18n');
    const paths = disallowedPaths();
    expect(paths).toHaveLength(DISALLOWED_PATHS.length * locales.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('never disallows a path the sitemap offers', async () => {
    const { disallowedPaths, indexableEntries } = await loadSeo('https://example.test');
    const blocked = disallowedPaths();
    for (const entry of indexableEntries()) {
      const path = new URL(entry.url).pathname;
      const hit = blocked.find((rule) => path.startsWith(rule));
      expect(hit, `${path} is both listed and blocked via ${hit}`).toBeUndefined();
    }
  });
});

describe('indexableEntries', () => {
  it('lists both languages, so the English pages hreflang points at are crawlable', async () => {
    const { indexableEntries } = await loadSeo('https://example.test');
    const urls = indexableEntries().map((entry) => entry.url);
    expect(urls).toEqual(
      expect.arrayContaining([
        'https://example.test/',
        'https://example.test/en',
        'https://example.test/pricing',
        'https://example.test/en/pricing',
      ]),
    );
  });

  it('emits one entry per route per locale', async () => {
    const { indexableEntries, INDEXABLE_PATHS } = await loadSeo('https://example.test');
    const { locales } = await import('@/lib/i18n');
    expect(indexableEntries()).toHaveLength(INDEXABLE_PATHS.length * locales.length);
  });

  it('gives every entry an absolute URL', async () => {
    const { indexableEntries } = await loadSeo('https://example.test');
    for (const entry of indexableEntries()) {
      expect(entry.url.startsWith('https://example.test'), entry.url).toBe(true);
    }
  });

  it('pairs the two languages of a route with each other and with x-default', async () => {
    const { indexableEntries } = await loadSeo('https://example.test');
    const pricing = indexableEntries().filter((entry) => entry.url.endsWith('pricing'));
    expect(pricing).toHaveLength(2);
    for (const entry of pricing) {
      expect(entry.languages).toEqual({
        he: 'https://example.test/pricing',
        en: 'https://example.test/en/pricing',
        'x-default': 'https://example.test/pricing',
      });
    }
  });

  it('makes x-default the Hebrew URL on every entry', async () => {
    const { indexableEntries } = await loadSeo('https://example.test');
    for (const entry of indexableEntries()) {
      expect(entry.languages['x-default'], entry.url).toBe(entry.languages.he);
    }
  });

  it('declares each entry as one of its own alternates', async () => {
    const { indexableEntries } = await loadSeo('https://example.test');
    for (const entry of indexableEntries()) {
      expect(Object.values(entry.languages), entry.url).toContain(entry.url);
    }
  });
});
