'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { buttonClass } from '@/components/ui/button';
import { getDictionary } from '@/config/dictionary';
import { alternateLocale, languageTag, localePath, stripLocale, type Locale } from '@/lib/i18n';

/**
 * Moves between the two languages, keeping the reader on the same page.
 *
 * The label is written in the language it switches *to* — a reader who cannot read the
 * current one still recognises the way out — so it comes from the *current* locale's
 * dictionary, whose `languageSwitch` entry points at the other. `lang` and `hrefLang`
 * are set to the target so a screen reader announces "EN" / "עברית" in the right voice
 * and search engines see a genuine alternate.
 *
 * The path is read from the router rather than passed in, so one component serves every
 * page: it strips whatever prefix the current URL carries and re-prefixes it for the
 * other locale, which keeps the reader on the same page instead of dropping them home.
 */
export function LanguageSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const target = alternateLocale(locale);
  const href = localePath(target, stripLocale(pathname));
  const { label, ariaLabel } = getDictionary(locale).languageSwitch;

  return (
    <Link
      href={href}
      lang={languageTag(target)}
      hrefLang={languageTag(target)}
      aria-label={ariaLabel}
      className={buttonClass({ variant: 'ghost', size: 'sm' })}
    >
      {label}
    </Link>
  );
}
