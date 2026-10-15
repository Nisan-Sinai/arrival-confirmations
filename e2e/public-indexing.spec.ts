import { expect, test } from '@playwright/test';

for (const locale of ['he', 'en'] as const) {
  test(`public page identity and useful content survive navigation (${locale})`, async ({
    page,
  }) => {
    const prefix = locale === 'he' ? '' : '/en';
    await page.goto(`${prefix}/pricing`);
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(5);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      new RegExp(`${prefix}/pricing$`),
    );
    await page
      .getByRole('link', {
        name:
          locale === 'he'
            ? 'מדריך כלי הנגישות והתאמות השימוש במערכת'
            : 'Guide to the accessibility tools and supported ways to use the platform',
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/accessibility$`));
    await expect(
      page.getByRole('heading', {
        name:
          locale === 'he'
            ? 'שימוש בכלי הנגישות במערכת אישורי ההגעה'
            : 'Using the accessibility tools in Arrival Confirmations',
      }),
    ).toBeVisible();
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      new RegExp(`${prefix}/accessibility$`),
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`${prefix}/accessibility$`),
    );
    await expect(page.locator('h1')).toHaveCount(1);
  });
}
