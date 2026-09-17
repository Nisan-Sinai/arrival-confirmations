import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
import { BrandMark } from '@/features/layout/BrandMark';
import { LanguageSwitch } from '@/features/layout/LanguageSwitch';
import { MobileNav, type MobileNavItem } from '@/features/layout/MobileNav';
import { alternateLocale, defaultLocale, languageTag, localePath, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * The public site header.
 *
 * `locale` drives the copy and every link; it defaults to Hebrew so the many
 * Hebrew-only pages that render the header need not name it. `showLanguageSwitch` is off
 * by default and turned on only where the page has a twin in the other language, so the
 * switch never offers a jump to a page that does not exist.
 *
 * Two bars in one: from `sm` up, the links sit in the row; below it they fold into a
 * sheet behind a hamburger, which is what lets every item — pricing included — reach a
 * phone at full size instead of being dropped to fit. The bar itself starts flush with
 * the page and picks up its edge as the page scrolls (`header-elevate`).
 */
export function SiteHeader({
  className,
  minimal = false,
  locale = defaultLocale,
  showLanguageSwitch = false,
}: {
  className?: string;
  minimal?: boolean;
  locale?: Locale;
  showLanguageSwitch?: boolean;
}) {
  const dictionary = getDictionary(locale);
  const target = alternateLocale(locale);

  const mobileItems: MobileNavItem[] = [
    { href: localePath(locale, '/pricing'), label: dictionary.header.pricing },
    { href: localePath(locale, '/login'), label: dictionary.header.login },
    ...(showLanguageSwitch
      ? [
          {
            href: localePath(target, '/'),
            label: dictionary.languageSwitch.label,
            lang: languageTag(target),
          },
        ]
      : []),
    { href: localePath(locale, '/signup'), label: dictionary.header.signup, primary: true },
  ];

  return (
    <header
      className={cn(
        'header-elevate bg-background/85 sticky top-0 z-[var(--z-header)] border-b backdrop-blur-md',
        className,
      )}
    >
      <Container className="relative flex min-h-16 items-center justify-between gap-2 py-2 sm:min-h-18 sm:gap-3">
        <Link
          href={localePath(locale, '/')}
          aria-label={dictionary.header.homeAria}
          className="text-primary flex items-center gap-2.5 rounded-md font-[family-name:var(--font-display)] text-lg font-bold sm:text-xl"
        >
          <BrandMark animated className="size-9 shrink-0" />
          <span>{dictionary.site.name}</span>
        </Link>

        {!minimal && (
          <>
            <nav
              aria-label={dictionary.header.navAria}
              className="hidden shrink-0 items-center gap-1 sm:flex sm:gap-2"
            >
              {showLanguageSwitch && <LanguageSwitch locale={locale} />}
              <Link
                href={localePath(locale, '/pricing')}
                className={buttonClass({ variant: 'ghost', size: 'sm' })}
              >
                {dictionary.header.pricing}
              </Link>
              <Link
                href={localePath(locale, '/login')}
                className={buttonClass({ variant: 'ghost', size: 'sm' })}
              >
                {dictionary.header.login}
              </Link>
              <Link href={localePath(locale, '/signup')} className={buttonClass({ size: 'sm' })}>
                {dictionary.header.signup}
              </Link>
            </nav>
            <MobileNav
              items={mobileItems}
              openLabel={dictionary.header.menuOpen}
              closeLabel={dictionary.header.menuClose}
            />
          </>
        )}

        {minimal && showLanguageSwitch && <LanguageSwitch locale={locale} />}
      </Container>
    </header>
  );
}
