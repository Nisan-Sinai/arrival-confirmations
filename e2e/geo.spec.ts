import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import indexNow from '../config/indexnow.json';

const publicPaths = ['/', '/pricing', '/guide', '/privacy', '/accessibility'];

for (const prefix of ['', '/en']) {
  for (const path of publicPaths) {
    const route = path === '/' ? prefix || '/' : `${prefix}${path}`;
    test(`GEO public identity: ${route}`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      const origin = new URL(page.url()).origin;
      // Next emits the origin without a trailing slash for root metadata. Compare
      // normalized URLs while still checking the exact origin, path and query.
      for (const [selector, target] of [
        ['link[rel="canonical"]', route],
        ['link[hreflang="he"]', path],
        ['link[hreflang="en"]', path === '/' ? '/en' : `/en${path}`],
        ['link[hreflang="x-default"]', path],
      ]) {
        const link = page.locator(selector!);
        await expect(link).toHaveCount(1);
        const href = await link.getAttribute('href');
        expect(href).not.toBeNull();
        expect(new URL(href!).href).toBe(new URL(target!, origin).href);
      }
      await expect(page.locator('html')).toHaveAttribute('dir', prefix ? 'ltr' : 'rtl');
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S.{30,}/);
      expect(
        await page
          .locator('meta[name="robots"]')
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('content')).join(' ')),
      ).not.toContain('noindex');
    });
  }

  test(`GEO guide: mobile, structured data and accessibility ${prefix || 'he'} @a11y`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(`${prefix}/guide`);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main h2')).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      new RegExp(`${prefix}/guide$`),
    );
    const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
    expect(graph['@graph'][0].name).toBe(await page.locator('h1').innerText());
    expect(graph['@graph'][1]['@type']).toBe('BreadcrumbList');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test('GEO references are UTF-8 public text and never enumerate private routes', async ({
  request,
}) => {
  const key = await request.get(indexNow.ownershipFile);
  expect(key.status()).toBe(200);
  expect((await key.text()).trim()).toBe(indexNow.ownershipFile.slice(1, -4));
  const bing = await request.get('/BingSiteAuth.xml');
  expect(bing.status()).toBe(200);
  expect(await bing.text()).toMatch(/<users>[\s\S]*<user>[A-F0-9]{32}<\/user>[\s\S]*<\/users>/);
  for (const path of ['/llms.txt', '/llms-full.txt']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain; charset=utf-8');
    const text = await response.text();
    expect(text).toContain('ניסן סיני טכנולוגיות');
    expect(text).toContain('Nisan Sinai Technologies');
    expect(text).not.toMatch(/https?:\/\/[^\s)]+\/(?:e|invite|dashboard|admin|api)\//);
  }
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap.match(/<loc>/g)).toHaveLength(10);
  expect(sitemap).toContain('/en/guide');
  expect(sitemap).not.toMatch(/\/(e|invite|dashboard|admin|api|login|signup)(\/|<)/);
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Allow: /');
  for (const path of ['/api/', '/invite', '/share/', '/e/', '/en/e/', '/dashboard/', '/admin/']) {
    expect(robots).toContain(`Disallow: ${path}`);
  }
  const health = await request.get('/api/health');
  expect(health.headers()['x-robots-tag']).toContain('noindex');
});

test('search crawlers receive the public product description', async ({ request }) => {
  for (const userAgent of ['Googlebot', 'bingbot', 'OAI-SearchBot', 'PerplexityBot']) {
    const response = await request.get('/en', { headers: { 'User-Agent': userAgent } });
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('Manage your guest list');
  }
});
