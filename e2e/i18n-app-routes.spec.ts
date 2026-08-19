import { expect, test } from '@playwright/test';

test.describe('localized application routes', () => {
  test('English dashboard keeps the English locale through authentication', async ({ page }) => {
    await page.goto('/en/dashboard');
    await expect(page).toHaveURL(/\/en\/login(?:\?|$)/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });

  test('Hebrew dashboard keeps the Hebrew locale through authentication', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'he-IL');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('English platform admin keeps the English locale through authentication', async ({ page }) => {
    await page.goto('/en/admin/events');
    await expect(page).toHaveURL(/\/en\/login(?:\?|$)/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });
});
