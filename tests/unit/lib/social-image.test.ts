import { describe, expect, it } from 'vitest';
import { SITE_ORIGIN } from '@/lib/seo';
import { productShareCopy, socialImage } from '@/lib/social-image';

describe.each(['he', 'en'] as const)('public share image (%s)', (locale) => {
  it('uses a stable same-site localized image with dimensions and accessible text', () => {
    expect(socialImage(locale)).toEqual({
      url: `${SITE_ORIGIN}/social-image/${locale}`,
      width: 1200,
      height: 630,
      alt: `${productShareCopy[locale].title} — ${productShareCopy[locale].description}`,
    });
  });
  it('describes a free trial without promising a free event', () => {
    expect(productShareCopy[locale].trial).toContain(
      locale === 'he' ? 'בדיקה חינמית' : 'free trial',
    );
    expect(productShareCopy[locale].trial).not.toMatch(/בלי תשלום לפי אורח|free forever/i);
  });
});
