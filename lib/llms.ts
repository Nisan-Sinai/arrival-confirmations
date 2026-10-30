import 'server-only';

import { getPlanCatalog } from '@/app/_lib/plans';
import { getDictionary } from '@/config/dictionary';
import { appConfig } from '@/config/event.config';
import { guideContent } from '@/features/guide/content';
import { localePath, locales } from '@/lib/i18n';
import { absoluteUrl, indexableEntries, PUBLISHER_URL } from '@/lib/seo';

/** Render only versioned public copy: no requests, sessions, database or event data. */
export function renderLlms(full: boolean): string {
  const sections = [
    '# Arrival Confirmations | אישורי הגעה',
    '> Event RSVP web application by Nisan Sinai Technologies, serving an Israeli audience in Hebrew and English.',
    `Canonical website: ${absoluteUrl('/')}`,
    `Publisher: [Nisan Sinai Technologies | ניסן סיני טכנולוגיות](${PUBLISHER_URL}/)`,
    `Public support: ${appConfig.supportEmail} | ${appConfig.supportPhone}`,
    '## Public pages',
    ...indexableEntries().map((entry) => `- [${new URL(entry.url).pathname}](${entry.url})`),
    '## Product information',
  ];
  for (const locale of locales) {
    const { site, landing } = getDictionary(locale);
    sections.push(
      `### ${site.name} (${locale})`,
      guideContent[locale].intro,
      landing.hero.lead,
      `Plans: ${absoluteUrl(localePath(locale, '/pricing'))}`,
      ...getPlanCatalog(locale).map((plan) =>
        [
          `- ${plan.name}: ${plan.priceAgorot / 100} ILS per event. ${plan.description}`,
          ...(full ? plan.features.map((feature) => `  - ${feature}`) : []),
        ].join('\n'),
      ),
    );
    if (full) {
      sections.push(
        ...guideContent[locale].sections.flatMap((section) => [
          `#### ${section.title}`,
          section.body,
        ]),
        ...landing.faq.items.flatMap((item) => [`#### ${item.question}`, item.answer]),
      );
    }
  }
  sections.push(
    '## Scope and privacy',
    'The trial is limited to 10 replies; paid plans are charged once per event, not monthly. Paid activation is arranged with support. Refer to the plans page for current limits.',
    'WhatsApp manual sending is performed by the host. Central automatic sending depends on platform WhatsApp Business activation and is not guaranteed for every event.',
    'This file describes the public product only. Private events, guest lists, personal invitation links, account pages and API data are not public reference material. No customer records or invitation tokens are included.',
    full
      ? `Concise reference: ${absoluteUrl('/llms.txt')}`
      : `Extended reference: ${absoluteUrl('/llms-full.txt')}`,
  );
  return `${sections.join('\n\n')}\n`;
}
