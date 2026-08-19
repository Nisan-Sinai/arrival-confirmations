import Link from 'next/link';

import { Container } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
import { AccessibilityWidget } from '@/features/accessibility/AccessibilityWidget';
import { localePath, type Locale } from '@/lib/i18n';

/**
 * Site footer.
 *
 * The two legal links live here rather than on a single page because Israeli
 * regulation expects both the accessibility statement and the privacy notice to be
 * reachable from anywhere on the site, not only from a page a visitor has to find.
 *
 * It stays deliberately small on the invitation. A guest opening a link to a simcha is
 * not a visitor to a product's website, and a full sitemap footer under a family's
 * invitation would read as advertising placed on it.
 *
 * Both links go through `localePath`, so a reader who arrived on the English side stays
 * there. Hardcoding `/privacy` would make the footer the one place on the page where
 * the language changes underneath them.
 */
export function SiteFooter({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);

  return (
    <>
      <footer className="border-border/70 bg-surface-sand/50 mt-auto border-t">
        <Container className="flex flex-col items-center gap-6 py-10 text-center sm:flex-row sm:justify-between sm:text-start">
          <div>
            <p className="text-primary font-[family-name:var(--font-display)] text-base font-bold">
              {dictionary.site.name}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {dictionary.footer.builtBy}{' '}
              <span className="text-foreground font-semibold">{dictionary.footer.builderName}</span>
            </p>
          </div>

          <nav
            aria-label={dictionary.footer.navAria}
            className="text-muted-foreground flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm"
          >
            <Link
              className="hover:text-primary rounded-sm underline underline-offset-4"
              href={localePath(locale, '/privacy')}
            >
              {dictionary.footer.privacy}
            </Link>
            <Link
              className="hover:text-primary rounded-sm underline underline-offset-4"
              href={localePath(locale, '/accessibility')}
            >
              {dictionary.footer.accessibility}
            </Link>
          </nav>
        </Container>
      </footer>
      <AccessibilityWidget locale={locale} />
    </>
  );
}
