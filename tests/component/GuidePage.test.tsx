import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { guideContent } from '@/features/guide/content';
import { buildGuideMetadata, GuidePage } from '@/features/guide/GuidePage';
import { locales } from '@/lib/i18n';
import { PUBLISHER_URL } from '@/lib/seo';

vi.mock('next/navigation', () => ({ usePathname: () => '/guide' }));

describe.each(locales)('public RSVP guide (%s)', (locale) => {
  const prefix = locale === 'he' ? '' : '/en';
  it('pairs its own canonical, social URL and localized alternate', () => {
    const metadata = buildGuideMetadata(locale);
    expect(metadata.alternates?.canonical).toBe(`${prefix}/guide`);
    expect(metadata.alternates?.languages).toEqual({
      he: '/guide',
      en: '/en/guide',
      'x-default': '/guide',
    });
    expect(metadata.openGraph?.url).toContain(`${prefix}/guide`);
    expect(metadata.twitter?.description).toBe(metadata.description);
  });
  it('renders useful product answers and schema matching the visible page', () => {
    const { container } = render(<GuidePage locale={locale} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(guideContent[locale].title);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5);
    expect(screen.getByRole('link', { name: guideContent[locale].pricingLink })).toHaveAttribute(
      'href',
      `${prefix}/pricing`,
    );
    expect(screen.getByRole('link', { name: guideContent[locale].privacyLink })).toHaveAttribute(
      'href',
      `${prefix}/privacy`,
    );
    const schema = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!,
    );
    expect(schema['@graph'][0].name).toBe(guideContent[locale].title);
    expect(schema['@graph'][0].publisher.url).toBe(PUBLISHER_URL);
    expect(schema['@graph'][1].itemListElement[1].item).toContain(`${prefix}/guide`);
  });
});
