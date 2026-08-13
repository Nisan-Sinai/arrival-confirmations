import type { Locale } from '@/lib/i18n';

import { en } from './en';
import { he } from './he';
import type { Dictionary } from './types';

export type { Dictionary } from './types';

const dictionaries: Record<Locale, Dictionary> = { he, en };

/** The copy for one locale. Total, because `Locale` is closed. */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
