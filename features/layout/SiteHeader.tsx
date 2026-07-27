import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { cn } from '@/lib/utils';

/**
 * The product header (§7 of the design brief).
 *
 * The site had no header at all: every page opened straight into its own `<main>`,
 * with no wordmark, no way home and no route to sign in except by typing the URL.
 *
 * Two decisions worth stating.
 *
 * It carries no hamburger. The whole navigation is a wordmark and two actions, which
 * fit side by side at 320px — and a menu that exists to hide two links costs a client
 * component, a focus trap and an escape handler to reveal what was already visible.
 * §7 asks for a mobile menu that feels designed; the honest version of that here is
 * not needing one.
 *
 * It is deliberately absent from `/e/{publicId}`. An invitation should read as a card
 * someone sent, not as a page inside a product, and a "create your own event" button
 * above a family's simcha is an advertisement placed on their invitation. The footer
 * credit is the only product chrome a guest sees.
 */
export function SiteHeader({
  className,
  /**
   * Wordmark only, for the credential screens.
   *
   * A "כניסה / יצירת אירוע" pair above a sign-in form offers the user the page they
   * are already on. Dropping the actions leaves the one thing those screens genuinely
   * lacked: a way back to the site. Without any header at all — which is how they
   * shipped — /login was a dead end whose only exits were the two legal pages.
   */
  minimal = false,
}: {
  className?: string;
  minimal?: boolean;
}) {
  return (
    <header
      className={cn(
        'border-border/70 bg-background/85 sticky top-0 z-[--z-header] border-b backdrop-blur-md',
        className,
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4 sm:h-18">
        <Link
          href="/"
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
          אישורי הגעה
        </Link>

        {!minimal && (
          <nav aria-label="ניווט ראשי" className="flex items-center gap-1.5 sm:gap-3">
            <Link href="/login" className={buttonClass({ variant: 'ghost', size: 'sm' })}>
              כניסה
            </Link>
            <Link href="/signup" className={buttonClass({ size: 'sm' })}>
              יצירת אירוע
            </Link>
          </nav>
        )}
      </Container>
    </header>
  );
}
