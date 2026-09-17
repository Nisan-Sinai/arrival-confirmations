import Link from 'next/link';

import { Container } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
import { AccessibilityWidget } from '@/features/accessibility/AccessibilityWidget';
import { BrandMark } from '@/features/layout/BrandMark';
import { localePath, type Locale } from '@/lib/i18n';

/**
 * Site footer.
 *
 * The two legal links live here rather than on a single page because Israeli
 * regulation expects both the accessibility statement and the privacy notice to be
 * reachable from anywhere on the site, not only from a page a visitor has to find.
 *
 * Two tiers. The upper one — the mark, a sentence about the product, and two short
 * columns of links — is the footer of a product website. The lower bar carries the
 * studio credit and the legal links, and is the whole footer under an invitation:
 * `body:has([data-invitation-style])` hides the upper tier there, because a guest
 * opening a link to a simcha is not a visitor to a product's website, and a sitemap under
 * a family's invitation would read as advertising placed on it.
 *
 * The bottom bar keeps a clear strip on the left (`pl-20`), where the accessibility
 * widget floats: before this the widget sat on top of the very link that opens the
 * accessibility statement.
 *
 * Every link goes through `localePath`, so a reader who arrived on the English side stays
 * there.
 */
export function SiteFooter({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);
  const { footer, site } = dictionary;

  const linkClass =
    'text-muted-foreground hover:text-primary inline-flex min-h-8 items-center rounded-sm text-sm transition-colors duration-[--duration-fast]';

  return (
    <>
      <footer className="border-border/70 bg-surface-sand/60 mt-auto border-t">
        <Container>
          <div className="footer-columns grid gap-10 py-12 sm:grid-cols-[1.4fr_1fr_1fr] sm:gap-8 sm:py-14">
            <div className="max-w-sm">
              <p className="text-primary flex items-center gap-2.5 font-[family-name:var(--font-display)] text-lg font-bold">
                <BrandMark className="size-8" />
                {site.name}
              </p>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{footer.tagline}</p>
            </div>

            <nav aria-label={footer.productHeading}>
              <p className="text-eyebrow text-accent-strong font-semibold">{footer.productHeading}</p>
              <ul className="mt-3 flex flex-col gap-1">
                <li>
                  <Link className={linkClass} href={localePath(locale, '/pricing')}>
                    {footer.pricing}
                  </Link>
                </li>
                <li>
                  <Link className={linkClass} href={localePath(locale, '/login')}>
                    {footer.login}
                  </Link>
                </li>
                <li>
                  <Link className={linkClass} href={localePath(locale, '/signup')}>
                    {footer.signup}
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label={footer.legalHeading}>
              <p className="text-eyebrow text-accent-strong font-semibold">{footer.legalHeading}</p>
              <ul className="mt-3 flex flex-col gap-1">
                <li>
                  <Link className={linkClass} href={localePath(locale, '/privacy')}>
                    {footer.privacy}
                  </Link>
                </li>
                <li>
                  <Link className={linkClass} href={localePath(locale, '/accessibility')}>
                    {footer.accessibility}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <div className="border-border/70 flex flex-col items-center gap-4 border-t py-6 pb-24 text-center sm:flex-row sm:justify-between sm:pb-6 sm:pl-20 sm:text-start">
            <p className="text-muted-foreground text-sm">
              {footer.builtBy}{' '}
              <span className="text-foreground font-semibold">{footer.builderName}</span>
            </p>

            {/*
              The two legal links, repeated here on purpose: the columns above are hidden
              under an invitation, and these two have to stay reachable from every page on
              the site. `py-1.5` keeps each above the 24px target-size floor of WCAG 2.5.8.
            */}
            <nav
              aria-label={footer.navAria}
              className="text-muted-foreground flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm"
            >
              <Link
                className="hover:text-primary rounded-sm py-1.5 underline underline-offset-4"
                href={localePath(locale, '/privacy')}
              >
                {footer.privacy}
              </Link>
              <Link
                className="hover:text-primary rounded-sm py-1.5 underline underline-offset-4"
                href={localePath(locale, '/accessibility')}
              >
                {footer.accessibility}
              </Link>
            </nav>
          </div>
        </Container>
      </footer>
      <AccessibilityWidget locale={locale} />
    </>
  );
}
