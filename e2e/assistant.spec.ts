import { expect, test } from '@playwright/test';

for (const width of [320, 390]) {
  for (const locale of ['he', 'en'] as const) {
    test(`AI launcher and conversation fit ${width}px in ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 720 });
      await page.goto(locale === 'he' ? '/' : '/en');
      const trigger = page.getByRole('button', {
        name: locale === 'he' ? 'פתיחת עוזר AI' : 'Open AI assistant',
        exact: true,
      });
      const accessibility = page.getByRole('button', {
        name: locale === 'he' ? 'פתיחת תפריט נגישות' : 'Open accessibility menu',
        exact: true,
      });
      await expect(trigger).toBeVisible();
      await expect(accessibility).toBeVisible();
      const aiBox = await trigger.boundingBox();
      const accessibilityBox = await accessibility.boundingBox();
      expect(aiBox).not.toBeNull();
      expect(accessibilityBox).not.toBeNull();
      expect(aiBox!.width).toBeLessThanOrEqual(80);
      expect(aiBox!.height).toBe(44);
      expect(width - aiBox!.x - aiBox!.width).toBeCloseTo(16, 0);
      expect(aiBox!.x).toBeGreaterThan(accessibilityBox!.x + accessibilityBox!.width + 16);

      await trigger.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const bounds = await dialog.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      const input = dialog.getByRole('textbox');
      await expect(input).toBeFocused();
      await input.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    });
  }
}

test('an AI service error preserves the question for retry', async ({ page }) => {
  // This verifies error UI only; a live model response remains a separate release gate.
  await page.route('**/api/assistant', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'העוזר אינו זמין כרגע.' }),
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'פתיחת עוזר AI', exact: true }).click();
  await page.getByRole('textbox', { name: 'השאלה שלכם' }).fill('איך שולחים הזמנה?');
  await page.getByRole('button', { name: 'שליחה', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('העוזר אינו זמין כרגע.');
  await expect(page.getByRole('textbox', { name: 'השאלה שלכם' })).toHaveValue('איך שולחים הזמנה?');
});
