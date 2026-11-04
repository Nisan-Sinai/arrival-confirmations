import { expect, test } from '@playwright/test';

test.describe('editorial event marketing redesign', () => {
  test('serves licensed local photography and a truthful illustrated sample', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('מנהלים את המוזמנים');

    const hero = page.getByRole('img', { name: /צילום להמחשה של שולחן חגיגי/ });
    await expect(hero).toBeVisible();
    await expect
      .poll(() => hero.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
    await expect(page.getByText('הזמנה דיגיטלית לדוגמה')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'אתם מתכננים את השמחה. המוזמנים כבר מסודרים.' }),
    ).toBeVisible();

    await page.locator('#benefits').scrollIntoViewIfNeeded();
    const secondary = page.getByRole('img', { name: /צילום להמחשה של מקום אירועים/ });
    await expect(secondary).toBeVisible();
    await expect
      .poll(() => secondary.evaluate((image: HTMLImageElement) => image.naturalWidth))
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
    await page.getByRole('link', { name: 'הדגמה חיה' }).click();
    await expect(page).toHaveURL(/#demo$/);
    await expect(page.getByRole('button', { name: 'פתיחת התפריט' })).toBeVisible();

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasOverflow).toBe(false);
  });

  test('English hero and sample are fully translated', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Manage your guest list');
    await expect(
      page.getByRole('img', {
        name: /Illustrative photograph of an elegant floral reception table/,
      }),
    ).toBeVisible();
    await expect(page.getByText('Sample digital invitation')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore the live demo' })).toHaveAttribute(
      'href',
      '#demo',
    );
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

  test('mobile photo caption stays clear of the invitation sample at all phone widths', async ({
    page,
  }) => {
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');

      const photo = page.getByTestId('editorial-hero-photo');
      const caption = page.getByTestId('hero-photo-caption');
      const card = page.getByTestId('sample-invite-card');
      await expect(photo).toBeVisible();
      await expect(caption).toBeVisible();
      await expect(card).toBeVisible();

      const [imageBox, captionBox, cardBox] = await Promise.all([
        photo.boundingBox(),
        caption.boundingBox(),
        card.boundingBox(),
      ]);
      expect(imageBox).not.toBeNull();
      expect(captionBox).not.toBeNull();
      expect(cardBox).not.toBeNull();

      // The sample belongs underneath the photo on phones, never over its caption.
      expect(cardBox!.y).toBeGreaterThanOrEqual(imageBox!.y + imageBox!.height + 8);
      expect(captionBox!.y + captionBox!.height).toBeLessThanOrEqual(
        imageBox!.y + imageBox!.height - 12,
      );
      expect(cardBox!.x).toBeGreaterThanOrEqual(0);
      expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(width);

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        ),
      ).toBe(false);
    }
  });

  test('desktop editorial caption is not covered by the floating sample invitation', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const [caption, card] = await Promise.all([
      page.getByTestId('hero-photo-caption').boundingBox(),
      page.getByTestId('sample-invite-card').boundingBox(),
    ]);

    expect(caption).not.toBeNull();
    expect(card).not.toBeNull();
    // The desktop sample may overlap the *photo*, but never its caption.
    expect(caption!.y + caption!.height + 8).toBeLessThanOrEqual(card!.y);
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
