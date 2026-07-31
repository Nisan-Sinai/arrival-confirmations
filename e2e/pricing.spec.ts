import { expect, test } from '@playwright/test';

test.describe('pricing', () => {
  test('presents the trial and both one-time event plans', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.getByRole('heading', { name: 'תשלום חד-פעמי לכל אירוע' })).toBeVisible();
    await expect(page.getByText('בדיקה חינמית', { exact: true })).toBeVisible();
    await expect(page.getByText('Basic', { exact: true })).toBeVisible();
    await expect(page.getByText('Premium', { exact: true })).toBeVisible();
    await expect(page.getByText('‏99 ‏₪', { exact: true })).toBeVisible();
    await expect(page.getByText('‏199 ‏₪', { exact: true })).toBeVisible();
    await expect(page.getByText('תשלום חד-פעמי לאירוע').first()).toBeVisible();
  });

  test('links to pricing from the public header', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'מחירים' }).click();
    await expect(page).toHaveURL(/\/pricing$/);
  });
});
