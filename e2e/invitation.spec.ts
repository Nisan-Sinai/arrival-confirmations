import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * End-to-end coverage of the guest-facing flow (§10.5, §9).
 *
 * These run against a real server and a real database. The event id comes from the
 * environment rather than being hard-coded, so the suite works against a seeded test
 * project as well as against a preview deployment.
 */

const EVENT_PUBLIC_ID = process.env.E2E_EVENT_PUBLIC_ID ?? '';
const eventPath = `/e/${EVENT_PUBLIC_ID}`;

/**
 * A phone number no real guest holds, unique per run so reruns never collide.
 *
 * An Israeli mobile is a two-digit prefix plus seven subscriber digits — ten
 * characters with the leading zero. An earlier version of this helper produced nine
 * and every submission was correctly rejected as `wrong_length`, which is a good
 * advertisement for the validator and a bad one for the test.
 */
function uniquePhone(): string {
  return `050${String(Date.now()).slice(-7)}`;
}

async function fillRequiredFields(page: Page, phone: string, name = 'בודק אוטומטי') {
  await page.getByLabel('שם מלא').fill(name);
  await page.getByLabel('טלפון').fill(phone);
  await page.getByRole('checkbox').check();
}

test.skip(EVENT_PUBLIC_ID === '', 'E2E_EVENT_PUBLIC_ID is not set');

test.describe('the landing page', () => {
  test('states the product and links to both legal pages', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('אישורי הגעה');
    await expect(page.getByRole('link', { name: 'מדיניות פרטיות' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'הצהרת נגישות' })).toBeVisible();
  });

  test('does not scroll sideways', async ({ page }) => {
    await page.goto('/');
    // The bug this guards: absolutely positioned ornament widening the document.
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });
});

test.describe('the invitation', () => {
  test('renders the event and its Hebrew date', async ({ page }) => {
    await page.goto(eventPath);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // §5: the Hebrew date is the one that anchors the occasion, so it must be present.
    await expect(page.locator('body')).toContainText('ב״ה');
  });

  test('is excluded from search indexes', async ({ page }) => {
    // §12, and a security control here: an indexed invitation defeats the point of
    // an unguessable URL.
    const response = await page.goto(eventPath);
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(response?.status()).toBe(200);
    expect(robots).toContain('noindex');
  });

  test('returns 404 for an unknown id, revealing nothing', async ({ page }) => {
    const response = await page.goto('/e/thisdoesnotexist');
    expect(response?.status()).toBe(404);
  });

  test('does not scroll sideways on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(eventPath);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });
});

test.describe('submitting an RSVP', () => {
  test('accepts a complete submission and confirms it', async ({ page }) => {
    await page.goto(eventPath);
    await fillRequiredFields(page, uniquePhone());
    await page.getByRole('button', { name: /שליחת אישור הגעה/ }).click();
    await expect(page.getByText('תודה רבה!')).toBeVisible({ timeout: 15_000 });
  });

  test('refuses an invalid phone number', async ({ page }) => {
    await page.goto(eventPath);
    await page.getByLabel('שם מלא').fill('בודק אוטומטי');
    await page.getByLabel('טלפון').fill('+14155550123');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /שליחת אישור הגעה/ }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
  });

  test('refuses a submission with consent unticked', async ({ page }) => {
    await page.goto(eventPath);
    await page.getByLabel('שם מלא').fill('בודק אוטומטי');
    await page.getByLabel('טלפון').fill(uniquePhone());
    await page.getByRole('button', { name: /שליחת אישור הגעה/ }).click();
    // Either the browser blocks it or the server rejects it; neither may succeed.
    await expect(page.getByText('תודה רבה!')).toBeHidden();
  });

  test('hides the counters once a guest declines', async ({ page }) => {
    await page.goto(eventPath);
    await page.getByRole('radio', { name: 'לא נוכל להגיע' }).check();
    // Asking how many are coming after "we cannot come" is a question with no answer.
    await expect(page.getByLabel('מבוגרים')).toBeHidden();
  });

  test('a repeat submission does not report failure', async ({ page }) => {
    // §6.4: the same phone twice is acknowledged, never told the row exists.
    const phone = uniquePhone();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await page.goto(eventPath);
      await fillRequiredFields(page, phone);
      await page.getByRole('button', { name: /שליחת אישור הגעה/ }).click();
      await expect(page.getByText('תודה רבה!')).toBeVisible({ timeout: 15_000 });
    }
  });
});

test.describe('@a11y accessibility', () => {
  const scan = async (page: Page, path: string) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    return results.violations;
  };

  test('the landing page has zero violations', async ({ page }) => {
    // §9 makes this a hard gate, not a warning.
    expect(await scan(page, '/')).toEqual([]);
  });

  test('the invitation has zero violations', async ({ page }) => {
    expect(await scan(page, eventPath)).toEqual([]);
  });

  test('the invitation is usable by keyboard alone', async ({ page }) => {
    await page.goto(eventPath);
    await page.keyboard.press('Tab');
    // §9 requires the skip link to be first in the tab order.
    const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
    expect(focused).toContain('דילוג לתוכן');
  });

  test('declares Hebrew and right-to-left', async ({ page }) => {
    await page.goto(eventPath);
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});
