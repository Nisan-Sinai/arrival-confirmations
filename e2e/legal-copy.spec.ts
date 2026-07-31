import { expect, test } from '@playwright/test';

test.describe('legal copy accuracy', () => {
  test('describes the cookies the current product actually uses', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.getByText(/עוגיות טכניות חיוניות של Supabase/)).toBeVisible();
    await expect(page.getByText(/אורחים שממלאים אישור הגעה/)).toBeVisible();
    await expect(page.locator('main')).not.toContainText('קישור הזמנה אישי');
  });
});
