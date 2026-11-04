import { expect, test } from '@playwright/test';

test.describe('editorial event marketing redesign', () => {
  test('restores the fully designed invitation and handwritten heading from main', async ({
    page,
  }) => {
    await page.goto('/');
    const hero = page.locator('main > section').first();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('מנהלים את המוזמנים');
    await expect(hero.locator('.written-word-writing').first()).toBeVisible();
    await expect(hero.locator('.tilt-scene')).toBeVisible();
    await expect(hero.getByText('בשבח והודיה לה׳ יתברך')).toBeVisible();
    await expect(hero.getByText('חתונה', { exact: true })).toBeVisible();
    await expect(hero.getByText('י״ד באלול')).toBeVisible();
    await expect(hero.getByText('אולמי הדר')).toBeVisible();
    await expect(hero.getByText('שנשלחת בוואטסאפ')).toBeVisible();
    await expect(page.locator('.marquee-track')).toHaveCount(1);

    await page.locator('#benefits').scrollIntoViewIfNeeded();
    const photo = page.getByRole('img', { name: /צילום להמחשה של מקום אירועים/ });
    await expect(photo).toBeVisible();
    await expect
      .poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
  });

  test('home navigation links reach the actual explanations and interactive demo', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await page
      .getByRole('navigation', { name: 'ניווט ראשי' })
      .getByRole('link', { name: 'איך זה עובד' })
      .click();
    await expect(page).toHaveURL(/#how-it-works$/);
    await expect(page.locator('#how-it-works')).toBeInViewport();

    await page
      .getByRole('navigation', { name: 'ניווט ראשי' })
      .getByRole('link', { name: 'הדגמה' })
      .click();
    await expect(page).toHaveURL(/#demo$/);
    await expect(page.locator('#demo')).toBeInViewport();
  });

  test('small Hebrew phone keeps all interactive sections in the viewport width', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/');

    await page.getByRole('button', { name: 'פתיחת התפריט' }).click();
    await page.locator('header .nav-sheet').getByRole('link', { name: 'הדגמה חיה' }).click();
    await expect(page).toHaveURL(/#demo$/);
    await expect(page.getByRole('button', { name: 'פתיחת התפריט' })).toBeVisible();

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasOverflow).toBe(false);
  });

  test('English handwritten hero and full invitation are translated', async ({ page }) => {
    await page.goto('/en');
    const hero = page.locator('main > section').first();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Manage your guest list');
    await expect(hero.getByText('With God’s help')).toBeVisible();
    await expect(hero.getByText('Wedding', { exact: true })).toBeVisible();
    await expect(hero.getByText('Hadar Hall')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Try the live demo' })).toHaveAttribute('href', '#demo');
  });

  test('landing pricing is transparent: three paid plans and full details on /pricing', async ({
    page,
  }) => {
    await page.goto('/');
    const plans = page.locator('#pricing');
    await expect(plans.getByRole('heading', { name: 'Basic' })).toBeVisible();
    await expect(plans.getByRole('heading', { name: 'Premium' })).toBeVisible();
    await expect(plans.getByRole('heading', { name: 'Pro' })).toBeVisible();
    await expect(plans.getByRole('heading', { name: 'בדיקה חינמית' })).toHaveCount(0);
    await expect(
      plans.getByRole('link', { name: /פרטים והפעלת Premium בוואטסאפ/ }),
    ).toHaveAttribute('href', /^https:\/\/wa\.me\//);
    await expect(
      plans.getByRole('link', { name: 'כל היתרונות וההשוואה המלאה' }).first(),
    ).toHaveAttribute('href', '/pricing');

    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: 'בדיקה חינמית' })).toBeVisible();
  });

  test('main invitation remains readable at 320–430px without any overlay collisions', async ({
    page,
  }) => {
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');

      const hero = page.locator('main > section').first();
      const letter = hero.locator('.tilt-scene');
      const confirmation = hero.getByText('שנשלחת בוואטסאפ');
      await expect(letter).toBeVisible();
      await expect(confirmation).toBeVisible();

      const [letterBox, captionBox] = await Promise.all([
        letter.boundingBox(),
        confirmation.boundingBox(),
      ]);
      expect(letterBox).not.toBeNull();
      expect(captionBox).not.toBeNull();
      expect(captionBox!.y).toBeGreaterThanOrEqual(letterBox!.y + letterBox!.height);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        ),
      ).toBe(false);
    }
  });

  test('original invitation responds to mouse movement and resets on leave', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const card = page.locator('main > section').first().locator('.tilt-scene');
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width * 0.8, box!.y + box!.height * 0.4);
    await expect
      .poll(() => card.locator('.tilt-target').evaluate((el) => el.style.getPropertyValue('--tilt-y')))
      .not.toBe('');
    await page.mouse.move(4, 4);
    await expect
      .poll(() => card.locator('.tilt-target').evaluate((el) => el.style.getPropertyValue('--tilt-y')))
      .toBe('');
  });

  test('captures real desktop and mobile layout for QA', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.screenshot({
      path: testInfo.outputPath('desktop-hero.jpg'),
      type: 'jpeg',
      quality: 60,
      animations: 'disabled',
    });

    await page.locator('#benefits').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath('desktop-benefits.jpg'),
      type: 'jpeg',
      quality: 60,
      animations: 'disabled',
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.screenshot({
      path: testInfo.outputPath('mobile-hero.jpg'),
      type: 'jpeg',
      quality: 60,
      animations: 'disabled',
    });
    await page.locator('#benefits').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath('mobile-benefits.jpg'),
      type: 'jpeg',
      quality: 60,
      animations: 'disabled',
    });

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      ),
    ).toBe(false);
  });
});
