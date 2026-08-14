import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
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
        'border-border/70 bg-background/85 sticky top-0 z-[--z-header] border-b backdrop-blur-md',
        className,
      )}
    >
      <Container className="flex min-h-16 items-center justify-between gap-3 py-2 sm:min-h-18">
        <Link
          href={localePath(locale, '/')}
          aria-label={dictionary.header.homeAria}
          className="text-primary flex items-center gap-2.5 rounded-md font-[family-name:var(--font-display)] text-lg font-bold sm:text-xl"
        >
          <span
            aria-hidden="true"
            className="border-accent-strong/40 text-accent-strong flex size-9 shrink-0 items-center justify-center rounded-full border"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4.5"
            >
              <path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
              <path d="M4 8l8 5 8-5" />
              <path d="M12 8V4M9.5 5.5 12 4l2.5 1.5" />
            </svg>
          </span>
          <span className="hidden sm:inline">{dictionary.site.name}</span>
        </Link>

        {!minimal && (
          <nav aria-label={dictionary.header.navAria} className="flex items-center gap-1 sm:gap-2">
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
        )}
      </Container>
    </header>
  );
}
