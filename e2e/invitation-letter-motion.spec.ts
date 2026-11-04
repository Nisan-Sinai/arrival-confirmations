import { expect, test } from '@playwright/test';

test.describe('the living sample invitation', () => {
  test('opens, folds and opens again with accessible keyboard controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const letter = page.getByTestId('sample-invite-card');
    const details = page.getByTestId('letter-details');
    const fold = page.getByRole('button', { name: 'סגירת המכתב לדוגמה' });
    await expect(letter).toHaveAttribute('data-state', 'open');
    await expect(fold).toHaveAttribute('aria-expanded', 'true');
    await expect(details).toHaveAttribute('aria-hidden', 'false');
    await expect(details.getByRole('link', { name: 'נסו להשיב להזמנה' })).toHaveAttribute(
      'href',
      '#demo',
    );

    await fold.focus();
    await fold.press('Enter');
    await expect(letter).toHaveAttribute('data-state', 'closed');
    const open = page.getByRole('button', { name: 'פתיחת המכתב לדוגמה' });
    await expect(open).toHaveAttribute('aria-expanded', 'false');
    await expect(details).toHaveAttribute('aria-hidden', 'true');
    await expect(details).toHaveAttribute('inert', '');

    await open.press('Space');
    await expect(letter).toHaveAttribute('data-state', 'open');
    await expect(details).toHaveAttribute('aria-hidden', 'false');
  });

  test('the invitation is translated in English and leads to the working RSVP demo', async ({
    page,
  }) => {
    await page.goto('/en');
    const letter = page.getByTestId('sample-invite-card');
    await expect(letter).toContainText('Sample digital invitation');
    await expect(letter).toContainText('Wedding');
    await expect(letter.getByRole('button', { name: 'Fold the sample invitation' })).toBeVisible();
    await letter.getByRole('link', { name: 'Try replying to the invitation' }).click();
    await expect(page).toHaveURL(/#demo$/);
  });

  test('the subtle mouse response is reversible without dragging content out of place', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const letter = page.getByTestId('sample-invite-card');
    const box = await letter.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move(box!.x + box!.width * 0.8, box!.y + box!.height * 0.45);
    await expect
      .poll(() => letter.evaluate((element) => element.style.getPropertyValue('--letter-rotate-y')))
      .not.toBe('');
    await page.mouse.move(4, 4);
    await expect
      .poll(() => letter.evaluate((element) => element.style.getPropertyValue('--letter-rotate-y')))
      .toBe('');
  });

  test('mobile invitation never overlaps the photo and respects reduced motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 760 });
      await page.goto('/');

      const [imageBox, letterBox] = await Promise.all([
        page.getByTestId('editorial-hero-photo').boundingBox(),
        page.getByTestId('sample-invite-card').boundingBox(),
      ]);
      expect(imageBox).not.toBeNull();
      expect(letterBox).not.toBeNull();
      expect(letterBox!.y).toBeGreaterThanOrEqual(imageBox!.y + imageBox!.height + 8);
      expect(letterBox!.x + letterBox!.width).toBeLessThanOrEqual(width);

      const animation = await page
        .getByTestId('sample-invite-card')
        .evaluate((element) => getComputedStyle(element).animationName);
      expect(animation).toBe('none');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        ),
      ).toBe(false);
    }
  });
});
