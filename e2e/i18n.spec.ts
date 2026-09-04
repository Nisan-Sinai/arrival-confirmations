import { expect, test, type Page } from '@playwright/test';

/**
 * The bilingual public surface (§12).
 *
 * Hebrew stays at the root and English lives under `/en`, so the invitation links
 * already sent over WhatsApp never move. These tests hold that boundary: the English
 * routes exist and render an English, left-to-right document, and the switch moves a
 * reader between the two versions of the same page rather than dropping them home.
 */

const ENGLISH_PATHS = [
  '/en',
  '/en/pricing',
  '/en/privacy',
  '/en/accessibility',
  '/en/login',
  '/en/signup',
  '/en/forgot-password',
  '/en/reset-password',
] as const;

const hasHorizontalOverflow = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );

test.describe('bilingual public surface', () => {
  test('serves the English landing as a left-to-right English document', async ({ page }) => {
    await page.goto('/en');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'en-GB');
    await expect(html).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Manage your guest list');
  });

  test('keeps Hebrew at the root as a right-to-left document', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'he-IL');
    await expect(html).toHaveAttribute('dir', 'rtl');
  });

  test('the language switch moves between the two versions of the same page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Switch to English' }).click();
    await expect(page).toHaveURL(/\/en$/);

    await page.getByRole('link', { name: 'מעבר לעברית' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('pairs each language with the other through hreflang alternates', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('link[rel="alternate"][hreflang="he"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
  });

  test('translates the plan cards on the English pricing page', async ({ page }) => {
    await page.goto('/en/pricing');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Paid once, per event' }),
    ).toBeVisible();
    await expect(page.getByText('Free trial', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Choose Basic' })).toBeVisible();
  });

  test('renders the English legal pages in English', async ({ page }) => {
    await page.goto('/en/privacy');
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible();

    await page.goto('/en/accessibility');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Accessibility statement' }),
    ).toBeVisible();
  });

  test('renders the English auth pages in English and keeps them out of the index', async ({
    page,
  }) => {
    await page.goto('/en/login');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Sign in to your account' }),
    ).toBeVisible();
    await expect(page.getByLabel('Email address')).toHaveAttribute('autocomplete', 'email');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

    await page.goto('/en/signup');
    await expect(page.getByRole('heading', { level: 1, name: 'Create an account' })).toBeVisible();
    await expect(page.getByLabel('Password')).toHaveAttribute('autocomplete', 'new-password');

    await page.goto('/en/forgot-password');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Reset your password' }),
    ).toBeVisible();
  });

  test('the English header funnels sign-up into the English flow', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('link', { name: 'Create an event' }).click();
    await expect(page).toHaveURL(/\/en\/signup$/);
  });

  test('an unknown English path stays English and links back into the English site', async ({
    page,
  }) => {
    const response = await page.goto('/en/this-page-does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute(
      'href',
      '/en',
    );
  });

  for (const path of ENGLISH_PATHS) {
    test(`${path} remains usable on a 320px phone`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 720 });
      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }
});
