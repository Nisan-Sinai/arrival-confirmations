import { expect, test, type Page } from '@playwright/test';

import {
  EVENT_ID,
  FIXTURE_ORIGIN,
  GUEST_COUNT,
  PUBLIC_ID,
  fixtureCookie,
} from './fixtures/scroll-data.mjs';

const guestsPath = `/dashboard/events/${EVENT_ID}/guests`;
const quickNavName = 'פעולות מהירות לניהול המוזמנים';

test.beforeEach(({ baseURL }) => {
  test.skip(
    process.env.NEXT_PUBLIC_SUPABASE_URL !== FIXTURE_ORIGIN ||
      !baseURL ||
      !['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname),
    'Uses a local synthetic event with 809 guests',
  );
});

function moveTo(page: Page, y: number) {
  return page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
}

test('the WhatsApp shortcut lands consistently past 809 guest rows', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(120_000);
  await context.addCookies([fixtureCookie(baseURL)]);
  await page.goto(guestsPath);
  const shortcut = page.locator('a[href="#whatsapp-send-center"]');
  const sendHeading = page.locator('#whatsapp-send-center h2');
  await expect(page.locator('#guest-list li')).toHaveCount(GUEST_COUNT);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

  for (const viewport of [
    { width: 393, height: 727 },
    { width: 320, height: 568 },
    { width: 430, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    for (const start of [0, 12_000, 55_000, 0]) {
      await moveTo(page, start);
      await shortcut.tap();
      await expect(page).toHaveURL(/#whatsapp-send-center$/);
      await expect(sendHeading).toBeInViewport({ ratio: 1 });
      const gap = await sendHeading.evaluate((heading, name) => {
        const bar = document.querySelector(`nav[aria-label="${name}"]`)!;
        return heading.getBoundingClientRect().top - bar.getBoundingClientRect().bottom;
      }, quickNavName);
      expect(gap, `width ${viewport.width} and starting scroll ${start}`).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThan(160);
    }
  }
});

test('the delete confirmation keeps a scrolled guest list in place', async ({
  page,
  context,
  baseURL,
  browserName,
}) => {
  await context.addCookies([fixtureCookie(baseURL)]);
  await page.goto(guestsPath);
  const reset = page.getByRole('button', { name: 'מחיקת כל המוזמנים', exact: true });
  await reset.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => Math.round(scrollY));
  await reset.tap();
  const dialog = page.getByRole('dialog', { name: /למחוק את כל 809 המוזמנים/ });
  const cancel = dialog.getByRole('button', { name: 'ביטול' });
  await expect(cancel).toBeInViewport();
  if (browserName === 'webkit') {
    await page.keyboard.press('PageDown');
  } else {
    await page.mouse.move(5, Math.floor(page.viewportSize()!.height / 2));
    await page.mouse.wheel(0, 500);
  }
  await expect(cancel).toBeFocused();
  expect(await page.evaluate(() => Math.round(scrollY))).toBe(before);
  await cancel.tap();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => Math.round(scrollY))).toBe(before);
});

test('the customer card opens the correct WhatsApp message and keeps the dashboard position', async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([fixtureCookie(baseURL)]);
  await context.route('https://api.whatsapp.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>WhatsApp fixture</title>' }),
  );
  await page.goto('/dashboard');
  const share = page.getByRole('link', { name: /^WhatsApp/ });
  await share.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => Math.round(scrollY));
  const popupOpened = page.waitForEvent('popup');
  await share.tap();
  const popup = await popupOpened;
  await expect(popup).toHaveTitle('WhatsApp fixture');
  const message = new URL(popup.url()).searchParams.get('text');
  expect(message).toContain(`/e/${PUBLIC_ID}`);
  expect(message).toContain('חתונת בדיקה');
  await popup.close();
  expect(await page.evaluate(() => Math.round(scrollY))).toBe(before);
});

test('the admin can test and submit WhatsApp sender settings', async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([fixtureCookie(baseURL, 'owner')]);
  await page.goto('/admin/settings/whatsapp');
  const sender = page.getByLabel('מספר WhatsApp שולח');
  const phoneId = page.getByLabel('WhatsApp Phone Number ID');
  await sender.fill('+972500000000');
  await phoneId.fill('12345');
  await page.getByRole('button', { name: 'בדיקת חיבור ל-Meta' }).tap();
  await expect(page).toHaveURL(/error=meta-not-configured/);
  await expect(sender).toHaveValue('+972500000000');
  await expect(phoneId).toHaveValue('12345');
  await page.getByRole('button', { name: 'שמירת המספר הפעיל' }).tap();
  await expect(page).toHaveURL(/saved=1/);
  await expect(page.getByText(/הגדרות WhatsApp נשמרו/)).toBeVisible();
});

test('the admin invitation preview has no fragment link to a missing RSVP form', async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([fixtureCookie(baseURL, 'owner')]);
  await page.goto(`/admin/events/${EVENT_ID}/preview`);
  await expect(page.getByText('תצוגה מקדימה למנהל', { exact: true })).toBeVisible();
  await expect(page.locator('a[href="#rsvp"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /חזרה לניהול האירוע/ })).toBeInViewport();
});

test('a guest who submits at the bottom sees the RSVP confirmation', async ({ page }) => {
  await page.goto(`/e/${PUBLIC_ID}`);
  await page.locator('a[href="#rsvp"]').tap();
  await expect(page).toHaveURL(/#rsvp$/);
  await expect(page.getByRole('heading', { name: 'אישור הגעה', exact: true })).toBeInViewport();
  await page.getByLabel('שם מלא').fill('אורח דוגמה');
  await page.getByLabel('טלפון').fill('0500000000');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /שליחת אישור הגעה/ }).tap();
  const success = page.getByRole('heading', { name: 'תודה רבה!' });
  await expect(success).toBeFocused();
  await expect(success).toBeInViewport({ ratio: 1 });
});
