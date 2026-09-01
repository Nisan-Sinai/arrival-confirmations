import { describe, expect, it } from 'vitest';

import { getPlanCatalog } from '@/app/_lib/plans';
import { getDictionary } from '@/config/dictionary';
import { appConfig } from '@/config/event.config';
import { locales, type Locale } from '@/lib/i18n';
import { PUBLISHER_URL, SITE_ORIGIN } from '@/lib/seo';
import { structuredData } from '@/lib/structuredData';

type Node = Record<string, unknown>;

function graph(locale: Locale): Node[] {
  return structuredData(locale)['@graph'] as unknown as Node[];
}

function node(locale: Locale, type: string): Node {
  const found = graph(locale).find((entry) => entry['@type'] === type);
  if (!found) throw new Error(`no ${type} node in the ${locale} graph`);
  return found;
}

describe('the graph as a whole', () => {
  it.each(locales)('carries the four nodes search results read (%s)', (locale) => {
    expect(graph(locale).map((entry) => entry['@type'])).toEqual([
      'Organization',
      'WebSite',
      'WebApplication',
      'FAQPage',
    ]);
  });

  it.each(locales)('declares the schema.org context (%s)', (locale) => {
    expect(structuredData(locale)['@context']).toBe('https://schema.org');
  });

  it.each(locales)('leaves no @id reference dangling (%s)', (locale) => {
    const declared = new Set(
      graph(locale)
        .map((entry) => entry['@id'])
        .filter(Boolean),
    );
    for (const [, id] of JSON.stringify(graph(locale)).matchAll(/"@id":"([^"]+)"/g)) {
      expect(declared.has(id), `${id} is referenced but never declared`).toBe(true);
    }
  });

  it.each(locales)('survives JSON serialisation, which is how it ships (%s)', (locale) => {
    expect(() => JSON.parse(JSON.stringify(structuredData(locale)))).not.toThrow();
  });
});

describe('Organization', () => {
  it.each(locales)('names the studio, not the product (%s)', (locale) => {
    expect(node(locale, 'Organization').name).toBe(getDictionary(locale).footer.builderName);
  });

  it.each(locales)('states what the studio does, in that locale (%s)', (locale) => {
    // The field exists to contradict Google's summary, which resolved the name against
    // an unrelated business. An empty or near-empty string would restore the ambiguity.
    const description = node(locale, 'Organization').description as string;
    expect(description).toBe(getDictionary(locale).site.publisherDescription);
    expect(description.length).toBeGreaterThan(40);
  });

  it.each(locales)('differs per locale, so neither language inherits the other (%s)', (locale) => {
    const other = locales.find((candidate) => candidate !== locale)!;
    expect(node(locale, 'Organization').description).not.toBe(
      node(other, 'Organization').description,
    );
  });

  it.each(locales)('links the studio to its own site via sameAs (%s)', (locale) => {
    expect(node(locale, 'Organization').sameAs).toEqual([PUBLISHER_URL]);
  });

  it.each(locales)('publishes a dialable support number in E.164 (%s)', (locale) => {
    const contact = node(locale, 'Organization').contactPoint as Node;
    expect(contact.telephone).toMatch(/^\+972\d{9}$/);
  });

  it.each(locales)('publishes the support address from config, not a copy (%s)', (locale) => {
    const contact = node(locale, 'Organization').contactPoint as Node;
    expect(contact.email).toBe(appConfig.supportEmail);
  });
});

describe('WebSite', () => {
  it.each(locales)('names the site, which is what Google renders above a result (%s)', (locale) => {
    // With this absent Google fell back to the registrable domain and labelled every
    // result "Vercel".
    expect(node(locale, 'WebSite').name).toBe(getDictionary(locale).site.name);
  });

  it.each(locales)('is attributed to the Organization node (%s)', (locale) => {
    expect(node(locale, 'WebSite').publisher).toEqual({
      '@id': node(locale, 'Organization')['@id'],
    });
  });

  it.each(locales)('sits at the site origin (%s)', (locale) => {
    expect(node(locale, 'WebSite').url).toBe(SITE_ORIGIN);
  });
});

describe('WebApplication', () => {
  it.each(locales)('does not claim to be free while listing paid plans (%s)', (locale) => {
    // The contradiction this replaced: isAccessibleForFree true beside three paid plans.
    const app = node(locale, 'WebApplication');
    const offers = app.offers as Node[];
    expect(app.isAccessibleForFree).toBe(false);
    expect(offers.some((offer) => Number(offer.price) > 0)).toBe(true);
  });

  it.each(locales)('offers every plan in the catalogue, trial included (%s)', (locale) => {
    const offers = node(locale, 'WebApplication').offers as Node[];
    expect(offers.map((offer) => offer.name)).toEqual(
      getPlanCatalog(locale).map((plan) => plan.name),
    );
  });

  it.each(locales)('prices the free trial at zero rather than omitting it (%s)', (locale) => {
    const offers = node(locale, 'WebApplication').offers as Node[];
    expect(offers.some((offer) => offer.price === '0')).toBe(true);
  });

  it.each(locales)('prices every offer in shekels, as a whole number (%s)', (locale) => {
    for (const offer of node(locale, 'WebApplication').offers as Node[]) {
      expect(offer.priceCurrency).toBe('ILS');
      expect(offer.price).toMatch(/^\d+$/);
    }
  });

  it.each(locales)('converts agorot to shekels rather than publishing agorot (%s)', (locale) => {
    const offers = node(locale, 'WebApplication').offers as Node[];
    const catalog = getPlanCatalog(locale);
    for (const [index, offer] of offers.entries()) {
      expect(Number(offer.price)).toBe(Math.round(catalog[index]!.priceAgorot / 100));
    }
  });

  it('sends the Hebrew offer to the unprefixed pricing page', () => {
    const offers = node('he', 'WebApplication').offers as Node[];
    expect(offers[0]!.url).toBe(`${SITE_ORIGIN}/pricing`);
  });

  it('sends the English offer to the prefixed pricing page', () => {
    const offers = node('en', 'WebApplication').offers as Node[];
    expect(offers[0]!.url).toBe(`${SITE_ORIGIN}/en/pricing`);
  });

  it.each(locales)('belongs to the WebSite and the Organization (%s)', (locale) => {
    const app = node(locale, 'WebApplication');
    expect(app.isPartOf).toEqual({ '@id': node(locale, 'WebSite')['@id'] });
    expect(app.publisher).toEqual({ '@id': node(locale, 'Organization')['@id'] });
  });
});

describe('FAQPage', () => {
  it.each(locales)('carries every question from the dictionary (%s)', (locale) => {
    const questions = node(locale, 'FAQPage').mainEntity as Node[];
    expect(questions.map((question) => question.name)).toEqual(
      getDictionary(locale).landing.faq.items.map((item) => item.question),
    );
  });

  it.each(locales)('answers each question rather than restating it (%s)', (locale) => {
    for (const question of node(locale, 'FAQPage').mainEntity as Node[]) {
      const answer = question.acceptedAnswer as Node;
      expect(answer['@type']).toBe('Answer');
      expect((answer.text as string).length).toBeGreaterThan(0);
    }
  });
});

describe('locale tagging', () => {
  it('tags the Hebrew graph he-IL', () => {
    expect(node('he', 'WebApplication').inLanguage).toBe('he-IL');
    expect(node('he', 'FAQPage').inLanguage).toBe('he-IL');
  });

  it('tags the English graph en-GB', () => {
    expect(node('en', 'WebApplication').inLanguage).toBe('en-GB');
    expect(node('en', 'FAQPage').inLanguage).toBe('en-GB');
  });
});
