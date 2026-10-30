import type { Locale } from '@/lib/i18n';
import { absoluteUrl } from '@/lib/seo';

/** Public product copy only. The free allowance is a trial, not a free live event. */
export const productShareCopy = {
  he: {
    eyebrow: 'הזמנה דיגיטלית',
    title: 'אישורי הגעה',
    description: 'אישורי הגעה וניהול מוזמנים לאירוע',
    trial: 'מתחילים בבדיקה חינמית · ללא מנוי חודשי',
  },
  en: {
    eyebrow: 'DIGITAL INVITATIONS',
    title: 'Arrival Confirmations',
    description: 'Personal invitations and guest management',
    trial: 'Start with a free trial · No monthly subscription',
  },
} as const;

/** Explicit images survive Next's shallow replacement of nested page metadata. */
export function socialImage(locale: Locale) {
  const copy = productShareCopy[locale];
  return {
    url: absoluteUrl(`/social-image/${locale}`),
    width: 1200,
    height: 630,
    alt: `${copy.title} — ${copy.description}`,
  };
}
