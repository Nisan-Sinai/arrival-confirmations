import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { buildPricingMetadata, PricingPageBody } from '@/features/pricing/PricingPageBody';
import {
  AccessibilityPageBody,
  buildAccessibilityMetadata,
} from '@/features/legal/AccessibilityPageBody';

vi.mock('next/navigation', () => ({ usePathname: () => '/pricing' }));

for (const locale of ['he', 'en'] as const) {
  const prefix = locale === 'he' ? '' : '/en';
  describe(`public page identity (${locale})`, () => {
    it('keeps page and social canonicals on the same public route', () => {
      for (const [path, metadata] of [
        ['/pricing', buildPricingMetadata(locale)],
        ['/accessibility', buildAccessibilityMetadata(locale)],
      ] as const) {
        expect(metadata.alternates?.canonical).toBe(`${prefix}${path}`);
        expect(new URL(String(metadata.openGraph?.url)).pathname).toBe(`${prefix}${path}`);
        expect(metadata.openGraph?.description).toBe(metadata.description);
        expect(metadata.openGraph).toMatchObject({
          locale: locale === 'he' ? 'he_IL' : 'en_GB',
          siteName: locale === 'he' ? 'אישורי הגעה' : 'Arrival Confirmations',
        });
        expect(metadata.twitter?.description).toBe(metadata.description);
      }
    });

    it('renders a useful comparison and a contextual link to accessibility', () => {
      render(<PricingPageBody locale={locale} />);
      expect(screen.getByRole('table')).toHaveAccessibleName(
        locale === 'he' ? 'איזה מסלול מתאים לאירוע שלכם?' : 'Which plan fits your event?',
      );
      expect(screen.getAllByRole('row')).toHaveLength(5);
      expect(screen.getByRole('table')).toHaveTextContent('2,500');
      expect(
        screen.getByRole('link', {
          name:
            locale === 'he'
              ? 'מדריך כלי הנגישות והתאמות השימוש במערכת'
              : 'Guide to the accessibility tools and supported ways to use the platform',
        }),
      ).toHaveAttribute('href', `${prefix}/accessibility`);
    });

    it('explains the existing accessibility controls and provides a home breadcrumb', () => {
      render(<AccessibilityPageBody locale={locale} />);
      expect(
        screen.getByRole('heading', {
          name:
            locale === 'he'
              ? 'שימוש בכלי הנגישות במערכת אישורי ההגעה'
              : 'Using the accessibility tools in Arrival Confirmations',
        }),
      ).toBeInTheDocument();
      expect(
        screen
          .getByRole('navigation', { name: locale === 'he' ? 'נתיב ניווט' : 'Breadcrumb' })
          .querySelector('a'),
      ).toHaveAttribute('href', prefix || '/');
      expect(screen.getByText(/Shift\+Tab/)).toBeInTheDocument();
    });
  });
}
