import { expect, test, type Page } from '@playwright/test';

/**
 * The bilingual public surface (§12).
 *
 * Hebrew stays at the root and English lives under `/en`, so the invitation links
 * already sent over WhatsApp never move. These tests hold that boundary: the English
 * routes exist and render an English, left-to-right document, and the switch moves a
 * reader between the two versions of the same page rather than dropping them home.
 */

const ENGLISH_PATHS = ['/en', '/en/pricing', '/en/privacy', '/en/accessibility'] as const;

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
