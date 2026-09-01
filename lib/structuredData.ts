import { getPlanCatalog } from '@/app/_lib/plans';
import { appConfig } from '@/config/event.config';
import { getDictionary } from '@/config/dictionary';
import { languageTag, localePath, type Locale } from '@/lib/i18n';
import { normalizeIsraeliPhone } from '@/lib/phone';
import { PUBLISHER_URL, SITE_ORIGIN, absoluteUrl } from '@/lib/seo';

/**
 * The `application/ld+json` graph, built from the dictionary and the plan catalogue.
 *
 * Four nodes, joined by `@id` rather than nested, because two of them are claims about
 * the *site* and the *publisher* rather than about this page, and a crawler that reaches
 * `/pricing` first should resolve the same two identities.
 *
 * The graph used to hold `WebApplication` and `FAQPage` alone, and the two nodes added
 * here are the ones search results actually read:
 *
 *   - `WebSite.name` is the field Google renders as the site name above a result. With
 *     it absent, Google fell back to the registrable domain and labelled every result
 *     "Vercel", beside Vercel's favicon. A custom domain is still the real fix — on a
 *     `*.vercel.app` subdomain Google may keep attributing the site to its host — but a
 *     missing name guarantees the fallback rather than merely risking it.
 *   - `Organization` is the entity record. Without one, Google resolved the publisher's
 *     name against an unrelated business and published a summary saying the studio is
 *     not connected to RSVP systems. `description` and `sameAs` are the correction.
 */
export function structuredData(locale: Locale) {
  const { landing, site, footer } = getDictionary(locale);
  const tag = languageTag(locale);
  const catalog = getPlanCatalog(locale);
  const organizationId = `${SITE_ORIGIN}/#organization`;
  const websiteId = `${SITE_ORIGIN}/#website`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: footer.builderName,
        url: SITE_ORIGIN,
        description: site.publisherDescription,
        areaServed: 'IL',
        knowsLanguage: ['he-IL', 'en-GB'],
        sameAs: [PUBLISHER_URL],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          // E.164. The config holds the number in the local form a person would dial,
          // and schema.org wants it dialable from anywhere.
          telephone: normalizeIsraeliPhone(appConfig.supportPhone),
          email: appConfig.supportEmail,
          availableLanguage: ['he', 'en'],
        },
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: site.name,
        url: SITE_ORIGIN,
        inLanguage: tag,
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'WebApplication',
        name: site.name,
        description: site.description,
        url: SITE_ORIGIN,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web',
        inLanguage: tag,
        isPartOf: { '@id': websiteId },
        publisher: { '@id': organizationId },
        /**
         * False, and the trial is an `Offer` at zero instead.
         *
         * This node previously claimed `isAccessibleForFree: true` while listing offers
         * at ₪99, ₪199 and ₪349 — a contradiction Google reads as one, and a promise the
         * product does not keep: the free tier stops at ten confirmations. Encoding the
         * trial as a priced offer states the same fact without the contradiction.
         */
        isAccessibleForFree: false,
        offers: catalog.map((plan) => ({
          '@type': 'Offer',
          name: plan.name,
          description: plan.description,
          price: String(Math.round(plan.priceAgorot / 100)),
          priceCurrency: 'ILS',
          availability: 'https://schema.org/InStock',
          url: absoluteUrl(localePath(locale, '/pricing')),
        })),
      },
      {
        '@type': 'FAQPage',
        inLanguage: tag,
        mainEntity: landing.faq.items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };
}
