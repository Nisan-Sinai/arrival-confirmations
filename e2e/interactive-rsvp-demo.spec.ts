import { expect, test } from '@playwright/test';

/**
 * The marketing demo is deliberately local state: clicking it must teach the product
 * without opening an account or changing a real event.
 */
test.describe('interactive RSVP showcase', () => {
  test('Hebrew demo updates the selected RSVP and party size', async ({ page }) => {
    await page.goto('/');
    const demo = page.locator('#demo');

    await expect(demo.getByRole('heading', { level: 2 })).toContainText('מהצד של האורח');
    await demo.getByRole('button', { name: 'לצערנו לא נוכל' }).click();
    await expect(demo.getByRole('button', { name: 'לצערנו לא נוכל' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(demo.locator('span[aria-live="polite"]').last()).toHaveText('לא מגיעים');

    await demo.getByRole('button', { name: 'בשמחה, מגיעים!' }).click();
    await demo.getByRole('button', { name: 'הגדלת מספר אורחים' }).click();
    await expect(demo.locator('span[aria-live="polite"]').last()).toContainText('3 אורחים');
    await expect(demo.getByText('נתונים להמחשה בלבד')).toBeVisible();
  });

  test('English demo uses translated controls', async ({ page }) => {
    await page.goto('/en');
    const demo = page.locator('#demo');

    await demo.getByRole('button', { name: 'Not sure yet' }).click();
    await expect(demo.getByRole('button', { name: 'Not sure yet' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(demo.locator('span[aria-live="polite"]').last()).toHaveText('Undecided');
    await expect(demo.getByRole('link', { name: /Try it with your own event/ })).toHaveAttribute(
      'href',
      '/en/signup',
    );
  });

  test('demo fits a narrow phone without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/');
    await page.locator('#demo').scrollIntoViewIfNeeded();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
  });
});
