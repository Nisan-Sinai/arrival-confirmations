import { expect, test } from '@playwright/test';

const PAID_PLANS = [
  { name: 'Basic', price: '99' },
  { name: 'Premium', price: '199' },
  { name: 'Pro', price: '349' },
] as const;

test.describe('commercial surface consistency', () => {
  test('the landing page presents every paid plan in copy and structured data', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('body')).toContainText(
      'Basic ב-99 ₪, Premium ב-199 ₪ או Pro ב-349 ₪',
    );

    const raw = await page.locator('script[type="application/ld+json"]').innerText();
    const graph = (JSON.parse(raw) as { '@graph': Record<string, unknown>[] })['@graph'];
    const app = graph.find((node) => node['@type'] === 'WebApplication');

    expect(app?.offers).toMatchObject(
      PAID_PLANS.map((plan) => ({
        name: plan.name,
        price: plan.price,
        priceCurrency: 'ILS',
      })),
    );
  });

  test('the signup page states the real free-trial limit', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.locator('body')).toContainText('עד 10 אישורי הגעה לבדיקה');
    await expect(page.locator('body')).not.toContainText('בלי הגבלה על מספר האורחים');
  });

  test('the pricing page includes Pro in its metadata and activation instructions', async ({
    page,
  }) => {
    await page.goto('/pricing');

    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Pro ב-349 ₪/);
    await expect(page.locator('body')).toContainText('מפעיל את Basic, Premium או Pro');
  });

  test('each paid-plan WhatsApp button identifies the selected plan', async ({ page }) => {
    await page.goto('/pricing');

    for (const plan of PAID_PLANS) {
      const href = await page.getByRole('link', { name: `בחירת ${plan.name}` }).getAttribute('href');
      expect(href).not.toBeNull();

      const url = new URL(href!);
      expect(url.hostname).toBe('wa.me');
      expect(url.searchParams.get('text')).toContain(`מסלול ${plan.name}`);
    }
  });
});
