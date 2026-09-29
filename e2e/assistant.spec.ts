import { expect, test } from '@playwright/test';

for (const width of [320, 390]) {
  for (const locale of ['he', 'en'] as const) {
    test(`assistant launcher and conversation fit ${width}px in ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 720 });
      await page.goto(locale === 'he' ? '/' : '/en');
      const trigger = page.getByRole('button', {
        name: locale === 'he' ? 'פתיחת העוזר' : 'Open assistant',
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

test('an assistant service error preserves the question for retry', async ({ page }) => {
  await page.route('**/api/assistant', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'העוזר אינו זמין כרגע.' }),
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'פתיחת העוזר', exact: true }).click();
  await page.getByRole('textbox', { name: 'השאלה שלכם' }).fill('איך שולחים הזמנה?');
  await page.getByRole('button', { name: 'שליחה', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('העוזר אינו זמין כרגע.');
  await expect(page.getByRole('textbox', { name: 'השאלה שלכם' })).toHaveValue('איך שולחים הזמנה?');
});

test('a suggested question produces a grounded answer with a safe site link', async ({ page }) => {
  await page.route('**/api/assistant', async (route) => {
    const body = route.request().postDataJSON();
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: 'כמה עולה?' });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        answer: 'המחיר נקבע לפי המסלול ומפורט בעמוד המחירים.',
        links: [{ href: '/pricing', label: 'מחירים ומסלולים' }],
        source: 'guide',
      }),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'פתיחת העוזר', exact: true }).click();
  await page.getByRole('button', { name: 'כמה עולה?', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('המחיר נקבע לפי המסלול');
  await expect(page.getByRole('link', { name: 'מחירים ומסלולים' })).toHaveAttribute(
    'href',
    '/pricing',
  );
});

test('private event answers are omitted from later guide requests', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/assistant', async (route) => {
    calls += 1;
    const body = route.request().postDataJSON();
    if (calls === 2) {
      expect(JSON.stringify(body.messages)).not.toContain('אורחת א');
      expect(JSON.stringify(body.messages)).not.toContain('מי אישר?');
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        calls === 1
          ? { answer: 'אורחת א אישרה הגעה.', source: 'event', links: [] }
          : { answer: 'אפשר לערוך את האירוע בדשבורד.', source: 'guide', links: [] },
      ),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'פתיחת העוזר', exact: true }).click();
  await page.getByRole('textbox', { name: 'השאלה שלכם' }).fill('מי אישר?');
  await page.getByRole('button', { name: 'שליחה', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('אורחת א אישרה');
  await page.getByRole('textbox', { name: 'השאלה שלכם' }).fill('איך עורכים אירוע?');
  await page.getByRole('button', { name: 'שליחה', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('אפשר לערוך את האירוע בדשבורד.');
  expect(calls).toBe(2);
});
