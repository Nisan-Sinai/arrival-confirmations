import { describe, expect, it } from 'vitest';

import { getPlanCatalog } from '@/app/_lib/plans';
import { GET as concise } from '@/app/llms.txt/route';
import { GET as extended } from '@/app/llms-full.txt/route';
import { getDictionary } from '@/config/dictionary';
import { guideContent } from '@/features/guide/content';
import { locales } from '@/lib/i18n';
import { renderLlms } from '@/lib/llms';
import { indexableEntries, PUBLISHER_URL } from '@/lib/seo';

describe('public product reference files', () => {
  it.each([false, true])(
    'lists only published public pages and the verified publisher (full=%s)',
    (full) => {
      const text = renderLlms(full);
      expect(text).toContain(PUBLISHER_URL);
      for (const entry of indexableEntries()) expect(text).toContain(`](${entry.url})`);
      const links = [...text.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map(
        (match) => new URL(match[1]!),
      );
      expect(
        links.every(
          (link) => !/\/(e|invite|api|dashboard|admin|auth|login|signup)(\/|$)/.test(link.pathname),
        ),
      ).toBe(true);
      expect(text).not.toMatch(/service_role|TOKEN_PEPPER|IP_HASH_PEPPER|SUPABASE_ANON_KEY/);
      expect(text).toContain('trial is limited to 10 replies');
      expect(text).toContain('depends on platform WhatsApp Business activation');
    },
  );

  it('keeps both languages, every public price, feature and FAQ synchronized with visible copy', () => {
    const full = renderLlms(true);
    for (const locale of locales) {
      expect(full).toContain(guideContent[locale].intro);
      for (const section of guideContent[locale].sections) expect(full).toContain(section.body);
      for (const plan of getPlanCatalog(locale)) {
        expect(full).toContain(`${plan.name}: ${plan.priceAgorot / 100} ILS`);
        for (const feature of plan.features) expect(full).toContain(feature);
      }
      for (const item of getDictionary(locale).landing.faq.items) {
        expect(full).toContain(item.question);
        expect(full).toContain(item.answer);
      }
    }
    expect(full.length).toBeGreaterThan(renderLlms(false).length);
    expect(full).not.toContain('Automatic sending from the platform WhatsApp Business number');
  });

  it.each([
    [concise, false],
    [extended, true],
  ] as const)('serves a UTF-8 text reference', async (handler, full) => {
    const response = handler();
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(await response.text()).toBe(renderLlms(full));
  });
});
