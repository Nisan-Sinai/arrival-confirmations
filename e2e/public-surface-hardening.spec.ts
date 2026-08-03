import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const RESPONSIVE_PATHS = [
  '/',
  '/pricing',
  '/signup',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/accessibility',
] as const;

const hasHorizontalOverflow = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );

test.describe('public surface hardening', () => {
  for (const path of RESPONSIVE_PATHS) {
    test(`${path} remains usable on a 320px phone`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 720 });
      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }

  test('the pricing page has zero WCAG 2.2 AA violations', async ({ page }) => {
    await page.goto('/pricing');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('the release health endpoint is live, uncached and identifies a release', async ({
    request,
  }) => {
    const response = await request.get('/api/health');
    const body = (await response.json()) as { status?: string; release?: string };

    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(body.status).toBe('ok');
    expect(body.release).toMatch(/\S+/);
  });

  test('the authentication forms provide password-manager semantics', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByLabel('כתובת אימייל')).toHaveAttribute('autocomplete', 'email');
    await expect(page.getByLabel('סיסמה')).toHaveAttribute('autocomplete', 'new-password');

    await page.goto('/login');
    await expect(page.getByLabel('כתובת אימייל')).toHaveAttribute('autocomplete', 'email');
    await expect(page.getByLabel('סיסמה')).toHaveAttribute('autocomplete', 'current-password');
  });
});
