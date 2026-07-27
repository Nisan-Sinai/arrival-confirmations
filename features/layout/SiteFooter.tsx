import Link from 'next/link';

import { Container } from '@/components/ui/layout';

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
 */
export function SiteFooter() {
  return (
    <footer className="border-border/70 bg-surface-sand/50 mt-auto border-t">
      <Container className="flex flex-col items-center gap-6 py-10 text-center sm:flex-row sm:justify-between sm:text-start">
        <div>
          <p className="text-primary font-[family-name:var(--font-display)] text-base font-bold">
            אישורי הגעה
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            האתר עוצב ופותח ע״י{' '}
            <span className="text-foreground font-semibold">ניסן סיני טכנולוגיות</span>
          </p>
        </div>

        <nav
          aria-label="קישורי חובה"
          className="text-muted-foreground flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm"
        >
          <Link
            className="hover:text-primary rounded-sm underline underline-offset-4"
            href="/privacy"
          >
            מדיניות פרטיות
          </Link>
          <Link
            className="hover:text-primary rounded-sm underline underline-offset-4"
            href="/accessibility"
          >
            הצהרת נגישות
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
