import { expect, test } from '@playwright/test';

test.describe('pricing', () => {
  test('presents the trial and all three one-time event plans', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.getByRole('heading', { name: 'תשלום חד-פעמי לכל אירוע' })).toBeVisible();
    await expect(page.getByText('בדיקה חינמית', { exact: true })).toBeVisible();
    await expect(page.getByText('Basic', { exact: true })).toBeVisible();
    await expect(page.getByText('Premium', { exact: true })).toBeVisible();
    await expect(page.getByText('Pro', { exact: true })).toBeVisible();
    await expect(page.getByText('‏99 ‏₪', { exact: true })).toBeVisible();
    await expect(page.getByText('‏199 ‏₪', { exact: true })).toBeVisible();
    await expect(page.getByText('‏349 ‏₪', { exact: true })).toBeVisible();
    await expect(page.getByText('עד 2,500 מוזמנים', { exact: true })).toBeVisible();
    await expect(page.getByText('תשלום חד-פעמי לאירוע').first()).toBeVisible();
  });

  /**
   * Reachability, not placement.
   *
   * The header carries the plans link on a wide viewport and drops it below `sm`, where
   * four items plus the mark did not fit and the sign-up button hung off the edge of the
   * screen. The footer carries it on every viewport so that trade costs a reader nothing
   * — and this project runs on Desktop Chrome *and* a Pixel 7, so the test states the
   * contract that holds on both: pricing is one tap from the chrome, wherever it sits.
   */
  test('reaches pricing from the site chrome on every viewport', async ({ page }) => {
    await page.goto('/');

    const header = page.getByRole('banner').getByRole('link', { name: 'מחירים', exact: true });
    const footer = page.getByRole('contentinfo').getByRole('link', { name: 'מסלולים ומחירים' });

    await expect(footer).toBeVisible();
    const link = (await header.isVisible()) ? header : footer;
    await link.click();
    await expect(page).toHaveURL(new RegExp('/pricing$'));
  });
});
