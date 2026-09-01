import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
import { BrandMark } from '@/features/layout/BrandMark';
import { LanguageSwitch } from '@/features/layout/LanguageSwitch';
import { defaultLocale, localePath, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * The public site header.
 *
 * `locale` drives the copy and every link; it defaults to Hebrew so the many
 * Hebrew-only pages that render the header need not name it. `showLanguageSwitch` is off
 * by default and turned on only where the page has a twin in the other language, so the
 * switch never offers a jump to a page that does not exist.
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

  return (
    <header
      className={cn(
        'border-border/70 bg-background/85 sticky top-0 z-[var(--z-header)] border-b backdrop-blur-md',
        className,
      )}
    >
      <Container className="flex min-h-16 items-center justify-between gap-2 py-2 sm:min-h-18 sm:gap-3">
        <Link
          href={localePath(locale, '/')}
          aria-label={dictionary.header.homeAria}
          className="text-primary flex items-center gap-2.5 rounded-md font-[family-name:var(--font-display)] text-lg font-bold sm:text-xl"
        >
          <BrandMark animated className="size-9 shrink-0" />
          <span className="hidden sm:inline">{dictionary.site.name}</span>
        </Link>

        {!minimal && (
          <nav
            aria-label={dictionary.header.navAria}
            className="flex shrink-0 items-center gap-0.5 sm:gap-2"
          >
            {showLanguageSwitch && <LanguageSwitch locale={locale} />}
            {/*
              Hidden below `sm`, and the only item that is.

              Four items plus the mark do not fit a phone. In English they never did:
              the bar measured 325px of content inside a 302px budget on a 390px screen —
              an iPhone 12 through 15 — so the sign-up button hung off the edge of every
              page on the site. Hebrew failed the same way at 320px.

              Pricing is the item that gives, because it is the one with somewhere else
              to be: the landing hero links to it, the plans section is on the page, and
              it is in the footer of every page precisely so that dropping it here costs
              a reader nothing.
            */}
            <Link
              href={localePath(locale, '/pricing')}
              className={buttonClass({
                variant: 'ghost',
                size: 'sm',
                className: 'hidden sm:inline-flex',
              })}
            >
              {dictionary.header.pricing}
            </Link>
            <Link
              href={localePath(locale, '/login')}
              className={buttonClass({ variant: 'ghost', size: 'sm', className: 'px-3 sm:px-4' })}
            >
              {dictionary.header.login}
            </Link>
            <Link
              href={localePath(locale, '/signup')}
              className={buttonClass({ size: 'sm', className: 'px-3 sm:px-4' })}
            >
              {dictionary.header.signup}
            </Link>
          </nav>
        )}
      </Container>
    </header>
  );
}
