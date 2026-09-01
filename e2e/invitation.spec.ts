import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

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
 * Every number this run handed out, so the teardown can remove exactly the rows it
 * caused and nothing else.
 */
const submittedPhones = new Set<string>();

/**
 * A phone number no real guest holds, unique per run so reruns never collide.
 *
 * An Israeli mobile is a two-digit prefix plus seven subscriber digits — ten
 * characters with the leading zero. An earlier version of this helper produced nine
 * and every submission was correctly rejected as `wrong_length`, which is a good
 * advertisement for the validator and a bad one for the test.
 */
function uniquePhone(): string {
  const phone = `050${String(Date.now()).slice(-7)}`;
  submittedPhones.add(phone);
  return phone;
}

/**
 * Removes the RSVPs this run submitted.
 *
 * These specs post real forms to a real database, and the database they were pointed
 * at is the live one — so every CI run left two more guests called "בודק אוטומטי" on
 * a real family's invitation, permanently, with nothing to distinguish them from
 * arrivals the hosts have to cater for. Four had accumulated before anyone looked.
 *
 * Keyed on the numbers this process generated rather than on the name, because a
 * delete driven by a display name is one careless duplicate away from removing a
 * guest. `service_role` is required: the anon key cannot delete an RSVP, which is
 * exactly the policy that ought to hold.
 *
 * A failure here fails the run. Cleanup that reports success while leaving rows
 * behind is how this went unnoticed for as long as it did.
 */
async function deleteSubmittedRsvps(): Promise<void> {
  if (submittedPhones.size === 0) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url === undefined || serviceRoleKey === undefined) {
    throw new Error('E2E submitted RSVPs with no service-role credentials to remove them.');
  }

  // The column stores E.164, and every number above is a local Israeli mobile.
  const normalized = [...submittedPhones].map((phone) => `+972${phone.slice(1)}`);

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { error } = await admin.from('rsvps').delete().in('phone_normalized', normalized);
  if (error !== null) {
    throw new Error(`E2E cleanup could not remove its own RSVPs: ${error.message}`);
  }

  submittedPhones.clear();
}

async function fillRequiredFields(page: Page, phone: string, name = 'בודק אוטומטי') {
  await page.getByLabel('שם מלא').fill(name);
  await page.getByLabel('טלפון').fill(phone);
  await page.getByRole('checkbox').check();
}

/**
 * Only the specs that address a seeded event need the id.
 *
 * This used to be a bare `test.skip(EVENT_PUBLIC_ID === '')` at module scope, which
 * skips *every* test in the file — including the landing page, the legal pages, the
 * 404, the overflow guards and the axe scans, none of which need an event to exist.
 * With the variable unset, which is the default everywhere except a fully configured
 * CI run, the entire end-to-end and accessibility suite reported success having
 * executed nothing at all.
 */
const requiresSeededEvent = () =>
  test.skip(EVENT_PUBLIC_ID === '', 'E2E_EVENT_PUBLIC_ID is not set');

/** Widths from §18 of the design brief that the layout must survive. */
const VIEWPORTS = [
  { name: '320px — the narrowest phone still in use', width: 320, height: 720 },
  { name: '375px — iPhone SE', width: 375, height: 812 },
  { name: '390px — iPhone 14', width: 390, height: 844 },
  { name: '430px — iPhone Pro Max', width: 430, height: 932 },
  { name: '768px — tablet portrait', width: 768, height: 1024 },
  { name: '1024px — tablet landscape', width: 1024, height: 768 },
  { name: '1280px — laptop', width: 1280, height: 800 },
  { name: '1440px — desktop', width: 1440, height: 900 },
] as const;

const hasHorizontalOverflow = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );

test.describe('the landing page', () => {
  test('states the product and links to both legal pages', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('מנהלים את המוזמנים');
    await expect(page.getByRole('link', { name: 'מדיניות פרטיות' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'הצהרת נגישות' })).toBeVisible();
  });

  test('offers a route to sign in and to sign up', async ({ page }) => {
    await page.goto('/');
    // The header did not exist before the redesign; there was no navigation at all.
    await expect(page.getByRole('navigation', { name: 'ניווט ראשי' })).toBeVisible();
  });

  // The bug this guards: an absolutely positioned ornament widening the document.
  for (const viewport of VIEWPORTS) {
    test(`does not scroll sideways at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});

test.describe('routes that used to 404', () => {
  /**
   * Both of these were reachable only from an email the application itself sends, and
   * both returned 404 — password recovery could not be completed and the OAuth
   * exchange had nowhere to land.
   */
  test('the password reset page exists and explains an expired link', async ({ page }) => {
    const response = await page.goto('/reset-password');
    expect(response?.status()).toBe(200);
    // Visiting without a recovery session is the expired-link case, not a redirect.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('פג תוקף');
  });

  test('the auth callback rejects a request with no code instead of 404ing', async ({ page }) => {
    await page.goto('/auth/callback');
    // Redirected to the login page, which now explains what went wrong.
    await expect(page).toHaveURL(/\/login\?error=auth/);
    // Matched by its text, not by role alone: Next.js keeps a permanently mounted
    // `role="alert"` route announcer in the document, so a bare role query resolves
    // to two elements and fails Playwright's strict mode.
    await expect(page.getByRole('alert').filter({ hasText: 'לא הצלחנו' })).toBeVisible();
  });

  test('an expired link is reported as expired, not as a generic failure', async ({ page }) => {
    // The distinction matters: "request another" is actionable, "something went
    // wrong" is not, and an expired recovery link is by far the common case.
    await page.goto('/auth/callback?error=access_denied&error_code=otp_expired');
    await expect(page).toHaveURL(/\/login\?error=expired/);
    await expect(page.getByRole('alert').filter({ hasText: 'פג תוקף' })).toBeVisible();
  });

  test('an unknown path renders the Hebrew 404, not the built-in English one', async ({ page }) => {
    const response = await page.goto('/no-such-page');
    expect(response?.status()).toBe(404);
    // The built-in page reads "This page could not be found." and sets its own title.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('לא נמצא');
    await expect(page.locator('body')).not.toContainText('This page could not be found');
  });
});

test.describe('security headers', () => {
  test('every response carries the headers that were entirely absent', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() ?? {};

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('geolocation=()');
    // An invitation carries names, a venue and a phone number; framing it is a
    // clickjack setup and there is no legitimate reason to embed one.
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy']).toContain("object-src 'none'");
    expect(headers['content-security-policy']).toContain("base-uri 'self'");
  });
});

/**
 * §12. The crawler-facing surface, which is invisible in every other suite: these are
 * artefacts nobody looks at while using the product, so a regression here is silent
 * until a host wonders why their link previews as a grey rectangle.
 */
test.describe('the crawlable surface', () => {
  test('serves a robots.txt that closes the invitation namespace', async ({ request }) => {
    const response = await request.get('/robots.txt');
    const body = await response.text();

    expect(response.status()).toBe(200);
    expect(body).toContain('Allow: /');
    // The line that matters: an indexed invitation defeats the unguessable URL.
    expect(body).toContain('Disallow: /e/');
    expect(body).toContain('Disallow: /dashboard/');
    expect(body).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
  });

  test('lists exactly the public pages that carry no personal data', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    const body = await response.text();

    expect(response.status()).toBe(200);
    const paths = [...body.matchAll(/<loc>(?<url>[^<]+)<\/loc>/g)].map((match) =>
      new URL(match[1]!).pathname.replace(/(.)\/$/, '$1'),
    );
    // Both languages. The English pages were absent while every Hebrew page carried an
    // `hreflang` pointing at them — Google was told the translations existed and never
    // handed a list of them to fetch.
    expect(paths).toEqual([
      '/',
      '/en',
      '/pricing',
      '/en/pricing',
      '/privacy',
      '/en/privacy',
      '/accessibility',
      '/en/accessibility',
    ]);
  });

  test('the landing page declares a canonical URL and a share card', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https?:\/\//);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /\/opengraph-image/,
    );
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
      'content',
      '1200',
    );
  });

  test('describes its one-time paid plans', async ({ page }) => {
    await page.goto('/');
    const raw = await page.locator('script[type="application/ld+json"]').innerText();
    const graph = (JSON.parse(raw) as { '@graph': Record<string, unknown>[] })['@graph'];

    const app = graph.find((node) => node['@type'] === 'WebApplication');
    /**
     * The trial is listed at zero rather than omitted, and `isAccessibleForFree` is
     * false beside it.
     *
     * The graph used to claim the application was free while listing three paid plans.
     * Google reads that as the contradiction it is, and the product does not keep the
     * promise either — the free tier stops at ten confirmations. A priced trial states
     * the same fact without the contradiction.
     */
    expect(app?.isAccessibleForFree).toBe(false);
    expect(app?.offers).toMatchObject([
      { name: 'בדיקה חינמית', price: '0', priceCurrency: 'ILS' },
      { name: 'Basic', price: '99', priceCurrency: 'ILS' },
      { name: 'Premium', price: '199', priceCurrency: 'ILS' },
      { name: 'Pro', price: '349', priceCurrency: 'ILS' },
    ]);

    // The two nodes that decide how the site is *named* in a result and which entity it
    // belongs to. Without them Google labelled every result "Vercel" and attributed the
    // publisher to an unrelated business of the same name.
    const site = graph.find((node) => node['@type'] === 'WebSite');
    const organization = graph.find((node) => node['@type'] === 'Organization');
    expect(site?.name).toBe('אישורי הגעה');
    expect(organization?.name).toBe('ניסן סיני טכנולוגיות');
    expect(site?.publisher).toEqual({ '@id': organization?.['@id'] });

    /**
     * Google treats FAQ markup describing questions absent from the page as a
     * structured-data violation, so the graph has to agree with what the page renders.
     * The questions sit in a `<summary>` and are visible while collapsed; the answers
     * are inside a closed `<details>`, which Google explicitly allows — content behind
     * an expander counts as present.
     */
    const faq = graph.find((node) => node['@type'] === 'FAQPage');
    const entries = faq?.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      await expect(page.getByText(entry.name, { exact: true })).toBeVisible();
      await expect(page.getByText(entry.acceptedAnswer.text, { exact: true })).toBeAttached();
    }
  });

  test('renders the product share card as a real PNG', async ({ request }) => {
    // The route lives in the `(he)` group, so Next serves it at a hashed path and
    // names that path in the `og:image` tag. Reading the URL from the page rather than
    // hardcoding it is what keeps this test honest about what a crawler actually fetches.
    const html = await (await request.get('/')).text();
    const content = html.match(/property="og:image" content="([^"]+)"/)?.[1];
    expect(content).toBeTruthy();
    const image = new URL(content!);

    const response = await request.get(`${image.pathname}${image.search}`);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
    // Satori draws Hebrew only when it is handed a font it can parse; a card that
    // failed to load one still returns 200, just far smaller and entirely blank.
    expect((await response.body()).byteLength).toBeGreaterThan(10_000);
  });
});

test.describe('the invitation', () => {
  requiresSeededEvent();

  /**
   * §12, and the distinction the whole OG effort rests on. `noindex` keeps the
   * invitation out of search results; Open Graph decides what WhatsApp draws when the
   * link is pasted into a family group. They look like they should conflict and do
   * not — losing the second in an attempt to enforce the first is the regression this
   * guards.
   */
  test('keeps its share card while staying out of search indexes', async ({ page, request }) => {
    await page.goto(eventPath);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

    const imageUrl = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(imageUrl).toContain(`/e/${EVENT_PUBLIC_ID}/opengraph-image`);
    // Named for the occasion, not for the product: this is the line a guest reads
    // under the picture before deciding whether to tap.
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /\S/);

    const image = await request.get(imageUrl!);
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/png');
    expect((await image.body()).byteLength).toBeGreaterThan(10_000);
  });

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
  requiresSeededEvent();

  test.afterAll(deleteSubmittedRsvps);

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

  /**
   * Every page that can be reached without a seeded event, scanned individually.
   *
   * Previously only the landing page and the invitation were covered, and both were
   * skipped whenever E2E_EVENT_PUBLIC_ID was unset — so in practice §9's "hard gate"
   * scanned nothing. The legal pages in particular are the ones a regulator looks at.
   */
  const PUBLIC_PATHS = [
    ['the landing page', '/'],
    ['the privacy notice', '/privacy'],
    ['the accessibility statement', '/accessibility'],
    ['the sign-in page', '/login'],
    ['the sign-up page', '/signup'],
    ['the password recovery page', '/forgot-password'],
    ['the expired-reset-link page', '/reset-password'],
    ['the 404 page', '/no-such-page'],
  ] as const;

  for (const [label, path] of PUBLIC_PATHS) {
    test(`${label} has zero violations`, async ({ page }) => {
      // §9 makes this a hard gate, not a warning.
      expect(await scan(page, path)).toEqual([]);
    });
  }

  test('the landing page is usable by keyboard alone', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    // §9 requires the skip link to be first in the tab order.
    const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
    expect(focused).toContain('דילוג לתוכן');
  });

  test('declares Hebrew and right-to-left', async ({ page }) => {
    await page.goto('/');
    // The BCP 47 tag, not the bare subtag — `languageTag('he')` emits `he-IL` so the
    // same value serves `lang`, `hreflang` and the `Intl` formatters.
    await expect(page.locator('html')).toHaveAttribute('lang', 'he-IL');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('stays readable and free of overflow at 200% zoom', async ({ page }) => {
    // WCAG 1.4.4. Emulated by halving the viewport, which is what a 200% zoom does
    // to the CSS pixel budget the layout has to work within.
    await page.setViewportSize({ width: 640, height: 512 });
    await page.goto('/');
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
});

test.describe('@a11y the invitation', () => {
  requiresSeededEvent();

  test('has zero violations', async ({ page }) => {
    await page.goto(eventPath);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
