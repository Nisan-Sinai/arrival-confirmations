import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const RESPONSIVE_PATHS = [
  '/',
  '/pricing',
  '/signup',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/accessibility',
] as const;

const hasHorizontalOverflow = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );

test.describe('public surface hardening', () => {
  for (const path of RESPONSIVE_PATHS) {
    test(`${path} remains usable on a 320px phone`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 720 });
      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }

  test('the sticky header stays above scrolled content and remains clickable on desktop', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const header = page.locator('header').first();
    await expect(header).toHaveCSS('position', 'sticky');
    await expect(header).toHaveCSS('z-index', '30');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(header).toBeInViewport();

    await header.getByRole('link', { name: 'יצירת אירוע', exact: true }).click();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test('the pricing page has zero WCAG 2.2 AA violations', async ({ page }) => {
    await page.goto('/pricing');

    /*
     * Scan what a reader is looking at, not what is still arriving.
     *
     * The plan cards fade in on a scroll-driven timeline, so a card below the fold is
     * genuinely at low opacity and axe is right to say its text has no contrast. Scanning
     * the instant the page loaded therefore measured the entrance rather than the page,
     * and it only stayed green by accident of where the cards happened to fall: laying
     * them out four-across at this width moved the whole row below the fold at once and
     * the same test started reporting 556 lines of violation on unchanged markup.
     *
     * The equivalent wait already guards the `@a11y` suite in `invitation.spec.ts`, for
     * the same reason. Scrolling the grid into view and letting it settle is what makes
     * this assertion about the design instead of about the timing.
     */
    await page.locator('main').getByRole('list').last().scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.reveal')].every(
        (el) => Number(getComputedStyle(el).opacity) > 0.99,
      ),
    );

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('the release health endpoint is live, uncached and identifies a release', async ({
    request,
  }) => {
    const response = await request.get('/api/health');
    const body = (await response.json()) as { status?: string; release?: string };

    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(body.status).toBe('ok');
    expect(body.release).toMatch(/\S+/);
  });

  test('the authentication forms provide password-manager semantics', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByLabel('כתובת אימייל')).toHaveAttribute('autocomplete', 'email');
    await expect(page.getByLabel('סיסמה')).toHaveAttribute('autocomplete', 'new-password');

    await page.goto('/login');
    await expect(page.getByLabel('כתובת אימייל')).toHaveAttribute('autocomplete', 'email');
    await expect(page.getByLabel('סיסמה')).toHaveAttribute('autocomplete', 'current-password');
  });

  /**
   * Every word of every written heading ends up written.
   *
   * This exists because one did not. The word "עד" rested permanently at
   * `clip-path: inset(0 0 0 50%)` — the ד simply gone — while every longer word in the
   * same heading was complete and the animation itself reported `finished`. The cause was
   * `steps(n)` reaching a progress of 1 only at the very last instant, and some
   * combinations of duration and delay landing a hair short of it.
   *
   * Nothing failed. No error, no warning, no test. A letter was missing from a marketing
   * headline for however long it took someone to photograph it, and the words most likely
   * to be hit are the shortest ones — at a single character the word disappears entirely.
   *
   * So the assertion is deliberately about the *outcome*, not the timing function: after
   * the reader has been down the page, no word may be left clipped.
   */
  for (const path of ['/', '/en', '/pricing', '/privacy']) {
    test(`every written word on ${path} finishes writing`, async ({ page }) => {
      await page.goto(path);

      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 400) {
        await page.evaluate((to) => window.scrollTo(0, to), y);
        await page.waitForTimeout(60);
      }
      // Comfortably past the longest heading on the site.
      await page.waitForTimeout(2500);

      const unfinished = await page.evaluate(() =>
        [...document.querySelectorAll('.written-word')]
          .map((word) => {
            const clip = getComputedStyle(word).clipPath;
            const inset = /inset\(([^)]+)\)/.exec(clip);
            if (inset === null) return null;
            // inset(top right bottom left) — the writing direction moves one of the two
            // horizontal sides from 100% to 0, so either being left above zero means the
            // word is still partly covered.
            const sides = inset[1]!
              .trim()
              .split(/\s+/)
              .map((value) => parseFloat(value) || 0);
            const covered = Math.max(sides[1] ?? 0, sides[3] ?? 0);
            return covered > 0.5 ? `${word.textContent} (${clip})` : null;
          })
          .filter((entry) => entry !== null),
      );

      expect(unfinished).toEqual([]);
    });
  }
});
