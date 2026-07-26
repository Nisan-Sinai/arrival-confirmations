import Link from 'next/link';

/**
 * Site footer.
 *
 * The two legal links live here rather than on a single page because Israeli
 * regulation expects both the accessibility statement and the privacy notice to be
 * reachable from anywhere on the site, not only from a page a visitor has to find.
 */
export function SiteFooter() {
  return (
    <footer className="border-border/60 text-muted-foreground mt-auto border-t px-4 py-8 text-center text-sm">
      <nav aria-label="קישורי חובה" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        <Link className="hover:text-primary underline underline-offset-4" href="/privacy">
          מדיניות פרטיות
        </Link>
        <Link className="hover:text-primary underline underline-offset-4" href="/accessibility">
          הצהרת נגישות
        </Link>
      </nav>
      <p className="mt-4">
        האתר עוצב ופותח ע״י <span className="text-primary font-semibold">ניסן סיני טכנולוגיות</span>
      </p>
    </footer>
  );
}
