import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('optional analytics offers equal choices, persists rejection, and can be reopened', async ({
  page,
}) => {
  await page.goto('/?token=private-value#personal');
  await expect(page.getByRole('heading', { name: 'העדפות עוגיות 🍪' })).toBeVisible();
  await expect(page.locator('script#public-google-analytics')).toHaveCount(0);
  await page.getByRole('button', { name: 'ללא עוגיות מדידה', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'העדפות עוגיות 🍪' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'העדפות עוגיות 🍪' })).toHaveCount(0);
  await page.getByRole('button', { name: 'הגדרות פרטיות', exact: true }).click();
  await expect(page.getByRole('button', { name: 'אישור עוגיות מדידה', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'אישור עוגיות מדידה', exact: true }).click();
  // CI/Preview origins never collect production data, even after consent.
  await expect(page.locator('script#public-google-analytics')).toHaveCount(0);
  await page.getByRole('button', { name: 'הגדרות פרטיות', exact: true }).click();
  await page.getByRole('button', { name: 'ללא עוגיות מדידה', exact: true }).click();
});

test('English consent is available and admin pages load no measurement', async ({ page }) => {
  await page.goto('/en');
  await page.getByRole('button', { name: 'Decline analytics cookies', exact: true }).click();
  await page.goto('/admin');
  await expect(page.locator('script#public-google-analytics')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Privacy settings', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'הגדרות פרטיות', exact: true })).toHaveCount(0);
});
