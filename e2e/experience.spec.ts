import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The redesigned public surface, and the defects that were fixed alongside it.
 *
 * Each block here holds one thing that was wrong in production and is easy to break
 * again without anything failing: a footer rule that lost to a utility in the cascade,
 * icons that pointed the wrong way in English, a cookie notice that had become the
 * page's largest paint. None of them threw; all of them were visible.
 */

const hasHorizontalOverflow = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );

/** Entrance animations finished, so a scan or a measurement sees the settled page. */
const settled = (page: Page) =>
  page.waitForFunction(() =>
    document.getAnimations().every((animation) => {
      if (animation.effect?.getTiming().iterations === Infinity) return true;
      if (!(animation.timeline instanceof DocumentTimeline)) return true;
      return animation.playState === 'finished';
    }),
  );

test.describe('the landing page', () => {
  test('shows the product as eight feature tiles under their own anchor', async ({ page }) => {
    await page.goto('/');

    const features = page.locator('#features');
    await features.scrollIntoViewIfNeeded();
    await expect(features.getByRole('heading', { level: 2 })).toContainText(
      'כל מה שצריך לאירוע מסודר',
    );
    await expect(features.getByRole('article')).toHaveCount(8);
    await expect(
      features.getByRole('heading', { level: 3, name: 'קוד QR להזמנה מודפסת' }),
    ).toBeVisible();
  });

  test('answers nine questions, and publishes the same nine as structured data', async ({
    page,
  }) => {
    await page.goto('/');

    const questions = page.locator('#faq details summary');
    await expect(questions).toHaveCount(9);
    const visible = (await questions.allInnerTexts()).map((text) => text.trim());

    const raw = await page.locator('script[type="application/ld+json"]').first().innerText();
    const graph = (JSON.parse(raw) as { '@graph': Record<string, unknown>[] })['@graph'];
    const faq = graph.find((node) => node['@type'] === 'FAQPage');
    const published = (faq?.mainEntity as { name: string }[]).map((entry) => entry.name);

    // A question in the markup that the page does not show is what gets a site's rich
    // results withdrawn, so the two lists are held equal rather than merely overlapping.
    expect(published).toEqual(visible);
  });

  test('opens an answer from the keyboard', async ({ page }) => {
    await page.goto('/');

    const first = page.locator('#faq details').first();
    await first.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(first).toHaveAttribute('open', '');
    await expect(first.locator('.faq-body')).toBeVisible();
  });

  test('compares the old way with the new, four rows of two', async ({ page }) => {
    await page.goto('/');

    const heading = page.getByRole('heading', { level: 2, name: 'אותו אירוע, בלי הרדיפה' });
    await heading.scrollIntoViewIfNeeded();
    const rows = heading.locator('xpath=ancestor::section').getByRole('listitem');
    await expect(rows).toHaveCount(4);
  });

  for (const path of ['/', '/en']) {
    test(`${path} stays inside a 320px phone from top to bottom`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 720 });
      await page.goto(path);

      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 600) {
        await page.evaluate((to) => window.scrollTo(0, to), y);
        expect(await hasHorizontalOverflow(page), `overflow at ${y}px`).toBe(false);
      }
    });
  }
});

test.describe('the largest paint', () => {
  // No stored consent, so the cookie notice appears — which is the case being measured.
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * The cookie notice mounts after hydration, and its paragraph used to be the largest
   * block of text on the screen: the page's Largest Contentful Paint was the consent
   * banner, several seconds in, and every performance score measured that instead of the
   * hero. The hero's own copy must stay the largest thing painted.
   */
  test('is the hero copy, not the cookie notice', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'העדפות עוגיות 🍪' })).toBeVisible();
    await settled(page);

    const largest = await page.evaluate(
      () =>
        new Promise<{ insideConsent: boolean; insideHero: boolean; text: string }>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries() as (PerformanceEntry & {
              element?: Element | null;
            })[];
            const element = entries.at(-1)?.element ?? null;
            resolve({
              insideConsent: (element?.closest('.analytics-consent') ?? null) !== null,
              insideHero: (element?.closest('main section') ?? null) !== null,
              text: (element?.textContent ?? '').slice(0, 60),
            });
          }).observe({ type: 'largest-contentful-paint', buffered: true });
        }),
    );

    expect(largest.insideConsent, `largest paint was: ${largest.text}`).toBe(false);
    expect(largest.insideHero, `largest paint was: ${largest.text}`).toBe(true);
  });

  test('the cookie notice wears the site’s own colours and offers equal choices', async ({
    page,
  }) => {
    await page.goto('/');
    const notice = page.locator('.analytics-consent');
    await expect(notice).toBeVisible();
    await settled(page);

    const decline = notice.getByRole('button', { name: 'ללא עוגיות מדידה', exact: true });
    const accept = notice.getByRole('button', { name: 'אישור עוגיות מדידה', exact: true });
    // Neither answer is styled as the primary one.
    for (const property of ['background-color', 'color', 'border-color', 'font-weight']) {
      expect(
        await decline.evaluate((node, name) => getComputedStyle(node)[name as never], property),
      ).toBe(
        await accept.evaluate((node, name) => getComputedStyle(node)[name as never], property),
      );
    }

    const results = await new AxeBuilder({ page })
      .include('.analytics-privacy')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('direction', () => {
  /**
   * "Forward" is leftwards in Hebrew and rightwards in English. The arrow in the hero's
   * call to action is drawn once, for Hebrew, and has to be mirrored on the English page.
   */
  test('the call-to-action arrow points forward in each language', async ({ page }) => {
    const arrowScale = () =>
      page
        .locator('main section')
        .first()
        .getByRole('link')
        .first()
        .locator('svg')
        .evaluate((node) => getComputedStyle(node).scale);

    await page.goto('/');
    expect(await arrowScale()).toBe('none');

    await page.goto('/en');
    expect(await arrowScale()).toBe('-1 1');
  });
});

test.describe('the footer', () => {
  test('carries a column of guides on a product page', async ({ page }) => {
    await page.goto('/pricing');

    const guides = page.getByRole('contentinfo').getByRole('navigation', { name: 'מדריכים' });
    await expect(guides.getByRole('link')).toHaveCount(4);
    await guides.getByRole('link', { name: 'אישורי הגעה לחתונה' }).click();
    await expect(page).toHaveURL(/\/wedding-rsvp$/);
  });

  /**
   * An invitation is not a product website, and its footer is meant to be the credit and
   * legal bar alone. The rule that hides the upper tier sat in a lower cascade layer than
   * the `grid` utility laying it out, so it never applied and every guest saw the
   * product's sitemap under a family's invitation.
   *
   * Asserted against the marker the invitation pages set, on a page that needs no seeded
   * event — the cascade is what is under test, not the invitation.
   */
  test('drops its product columns wherever a page marks itself as an invitation', async ({
    page,
  }) => {
    await page.goto('/privacy');
    const columns = page.locator('.footer-columns');
    await expect(columns).toBeVisible();

    await page.evaluate(() =>
      document.querySelector('main')!.setAttribute('data-invitation-style', 'classic'),
    );

    await expect(columns).toBeHidden();
    const legal = page.getByRole('navigation', { name: 'קישורי חובה' });
    await expect(legal.getByRole('link', { name: 'מדיניות פרטיות' })).toBeVisible();
    await expect(legal.getByRole('link', { name: 'הצהרת נגישות' })).toBeVisible();
  });
});

test.describe('the guides', () => {
  const GUIDES = ['/guide', '/wedding-rsvp', '/whatsapp-rsvp', '/bar-bat-mitzvah-rsvp'] as const;

  test('the contents list jumps to the section it names', async ({ page }) => {
    await page.goto('/guide');

    const contents = page.getByRole('navigation', { name: 'בעמוד הזה' });
    const links = contents.getByRole('link');
    await expect(links).toHaveCount(5);

    const third = links.nth(2);
    const title = (await third.innerText()).replace(/^\d+\s*/, '').trim();
    await third.click();
    await expect(page).toHaveURL(/#section-3$/);
    await expect(page.locator('#section-3').getByRole('heading', { level: 2 })).toHaveText(title);
    await expect(page.locator('#section-3')).toBeInViewport();
  });

  for (const prefix of ['', '/en']) {
    for (const path of GUIDES) {
      test(`${prefix}${path} fits a 320px phone and has zero violations @a11y`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 320, height: 720 });
        const response = await page.goto(`${prefix}${path}`);

        expect(response?.status()).toBe(200);
        await expect(page.locator('h1')).toHaveCount(1);
        expect(await hasHorizontalOverflow(page)).toBe(false);
        await settled(page);

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }
});

test.describe('paper', () => {
  test('a printed page carries its content and none of the site around it', async ({ page }) => {
    await page.goto('/pricing');
    await page.emulateMedia({ media: 'print' });

    await expect(page.getByRole('banner')).toBeHidden();
    await expect(page.getByRole('contentinfo')).toBeHidden();
    await expect(page.getByRole('button', { name: 'הגדרות פרטיות', exact: true })).toBeHidden();
    // The two floating buttons — the assistant and the accessibility menu — are fixed to
    // the viewport, which on paper means stamped over the content of every sheet.
    await expect(page.getByText('שאלו את העוזר')).toBeHidden();
    await expect(page.locator('[aria-controls="accessibility-panel"]')).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Nothing printed is left part-way through a scroll-driven reveal.
    const faded = await page.evaluate(
      () =>
        [...document.querySelectorAll('.reveal')].filter(
          (node) => Number(getComputedStyle(node).opacity) < 0.99,
        ).length,
    );
    expect(faded).toBe(0);
  });
});

test.describe('installable', () => {
  test('serves a manifest that opens the dashboard, and every page links to it', async ({
    page,
    request,
  }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.status()).toBe(200);
    const manifest = (await response.json()) as {
      start_url: string;
      display: string;
      icons: { src: string; sizes: string }[];
    };
    expect(manifest.start_url).toBe('/dashboard');
    expect(manifest.display).toBe('standalone');

    // Each icon the manifest names is really there, at the size it claims.
    for (const icon of manifest.icons) {
      const image = await request.get(icon.src);
      expect(image.status(), icon.src).toBe(200);
      const bytes = await image.body();
      const [width, height] = icon.sizes.split('x').map(Number);
      expect(bytes.readUInt32BE(16), icon.src).toBe(width);
      expect(bytes.readUInt32BE(20), icon.src).toBe(height);
    }

    for (const path of ['/', '/en', '/login']) {
      await page.goto(path);
      await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
        'href',
        '/manifest.webmanifest',
      );
    }
  });
});
