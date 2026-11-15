import { expect, test, type Locator, type Page } from '@playwright/test';

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

function scrollTo(page: Page, top: number) {
  return page.evaluate((value) => window.scrollTo({ top: value, behavior: 'instant' }), top);
}

function paintFrames(page: Page) {
  return page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

async function tapInViewport(page: Page, control: Locator) {
  await expect(control).toBeInViewport();
  const box = (await control.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

test('the short mobile menu scrolls to its final action without moving the page', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 390, height: 300 });
  await page.goto('/en/guide');
  await scrollTo(page, 650);
  const trigger = page.getByRole('button', { name: 'Open menu' });
  const before = await scrollY(page);
  await tapInViewport(page, trigger);

  const sheet = page.locator('.nav-sheet');
  await expect(sheet).toBeVisible();
  await expect
    .poll(() => sheet.evaluate((node) => Math.round(node.getBoundingClientRect().bottom)))
    .toBeLessThanOrEqual(300);
  expect(await sheet.evaluate((node) => node.scrollHeight - node.clientHeight)).toBeGreaterThan(0);
  const last = sheet.getByRole('link').last();
  if (browserName === 'webkit') {
    // Playwright's touch WebKit does not expose wheel input.
    await sheet.evaluate((node) => node.scrollBy({ top: 240, behavior: 'instant' }));
  } else {
    const sheetBox = (await sheet.boundingBox())!;
    await page.mouse.move(sheetBox.width / 2, sheetBox.y + sheetBox.height / 2);
    await page.mouse.wheel(0, 240);
  }
  await expect.poll(() => sheet.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await expect(last).toBeInViewport({ ratio: 0.9 });
  expect(await scrollY(page)).toBe(before);

  await tapInViewport(page, last);
  await expect(page).toHaveURL(/\/en\/signup$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  await expect(page.locator('.nav-sheet')).toBeHidden();
});

test('the current menu entry keeps scroll position and a new page starts at its heading', async ({
  page,
}) => {
  await page.goto('/en/guide');
  await scrollTo(page, 850);
  const before = await scrollY(page);
  const open = page.getByRole('button', { name: 'Open menu' });
  await tapInViewport(page, open);
  await tapInViewport(page, page.locator('.nav-sheet a[aria-current="page"]'));
  await expect(page.locator('.nav-sheet')).toBeHidden();
  expect(await scrollY(page)).toBe(before);
  await expect(open).toBeFocused();

  await tapInViewport(page, open);
  await tapInViewport(page, page.locator('.nav-sheet a[href="/en/pricing"]'));
  await expect(page).toHaveURL(/\/en\/pricing$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport({ ratio: 0.8 });
  await expect.poll(() => scrollY(page)).toBeLessThanOrEqual(80);
});

test('the video stays above the page, locks scrolling, and restores focus in portrait and landscape', async ({
  page,
  browserName,
}) => {
  await page.goto('/');
  const play = page.getByRole('button', { name: 'הפעלת סרטון ההדגמה' });
  for (const { width, height } of [
    { width: 390, height: 700 },
    { width: 740, height: 350 },
  ]) {
    await page.setViewportSize({ width, height });
    await play.scrollIntoViewIfNeeded();
    const before = await scrollY(page);
    await play.tap();

    const dialog = page.getByRole('dialog', { name: 'הפעלת סרטון ההדגמה' });
    const close = dialog.getByRole('button', { name: 'סגירת הסרטון' });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((node) => node.matches(':modal'))).toBe(true);
    await expect(close).toBeInViewport({ ratio: 1 });
    await expect(close).toBeFocused();
    await expect(dialog.locator('video')).toBeInViewport({ ratio: 1 });
    await expect
      .poll(() => dialog.evaluate((node) => Math.round(node.getBoundingClientRect().height)))
      .toBe(height);

    if (browserName === 'webkit') {
      await page.keyboard.press('PageDown');
    } else {
      await page.mouse.move(8, Math.floor(height / 2));
      await page.mouse.wheel(0, 420);
    }
    await paintFrames(page);
    expect(await scrollY(page)).toBe(before);

    if (width < height) await close.tap();
    else await close.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(play).toBeFocused();
    expect(await scrollY(page)).toBe(before);
    if (browserName === 'webkit') {
      await expect(page.locator('html')).toHaveCSS('overflow-y', 'visible');
    } else {
      await page.mouse.wheel(0, 300);
      await expect.poll(() => scrollY(page)).toBeGreaterThan(before);
    }
  }

  await play.scrollIntoViewIfNeeded();
  const before = await scrollY(page);
  await play.tap();
  await page.touchscreen.tap(8, 8);
  await expect(page.getByRole('dialog', { name: 'הפעלת סרטון ההדגמה' })).toBeHidden();
  expect(await scrollY(page)).toBe(before);
});

test('the touch assistant opens without focusing the keyboard and keeps its form reachable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 300 });
  await page.goto('/en/guide');
  await scrollTo(page, 500);
  const before = await scrollY(page);
  const trigger = page.getByRole('button', { name: 'Open assistant' });
  await tapInViewport(page, trigger);

  const dialog = page.getByRole('dialog', { name: 'RSVP assistant' });
  const close = dialog.getByRole('button', { name: 'Close assistant' });
  const question = dialog.getByRole('textbox');
  await expect(close).toBeFocused();
  await expect(question).not.toBeFocused();
  expect(await scrollY(page)).toBe(before);

  const send = dialog.getByRole('button', { name: 'Send', exact: true });
  await send.scrollIntoViewIfNeeded();
  await expect(send).toBeInViewport({ ratio: 0.9 });
  expect(await dialog.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  expect(await scrollY(page)).toBe(before);

  await question.tap();
  await question.fill('How can I share an invitation?');
  await expect(send).toBeEnabled();
  await question.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await scrollY(page)).toBe(before);
});

test('FAQ and accessibility controls keep the reader at the same position', async ({ page }) => {
  await page.goto('/');
  const faq = page.locator('#faq details').first();
  const question = faq.locator('summary');
  await question.scrollIntoViewIfNeeded();
  const before = await scrollY(page);
  await question.tap();
  await expect(faq).toHaveAttribute('open', '');
  expect(await scrollY(page)).toBe(before);
  await question.tap();
  await expect(faq).not.toHaveAttribute('open', '');
  expect(await scrollY(page)).toBe(before);

  const trigger = page.getByRole('button', { name: 'פתיחת תפריט נגישות' });
  await tapInViewport(page, trigger);
  const close = page.getByRole('button', { name: 'סגירת תפריט נגישות' }).first();
  await expect(close).toBeFocused();
  await close.press('Escape');
  await expect(trigger).toBeFocused();
  expect(await scrollY(page)).toBe(before);
});
