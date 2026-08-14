import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Rule } from '@/components/ui/layout';
import { UI_MESSAGES } from '@/config/messages';

/**
 * The body of the 404 page (§13), shared by the two places a miss can surface.
 *
 * A `notFound()` thrown inside the Hebrew route tree renders through `app/(he)`'s root
 * layout, so `app/(he)/not-found.tsx` needs the content alone. A genuinely unmatched
 * URL has no layout to render in — the site has two root layouts and neither owns an
 * address that was never routed — so `app/not-found.tsx` wraps this same content in the
 * document shell itself. Keeping the content here is what stops the two drifting.
 *
 * The copy is careful about one thing. This answers both "no such event" and "that
 * event is not published", and the invitation page returns the same 404 for either on
 * purpose (§4.2) — telling them apart would make the id space enumerable one probe at a
 * time. So the wording suggests asking the host rather than implying the link was valid.
 */
export function NotFoundContent() {
  return (
    <main id="main" className="flex flex-1 items-center justify-center px-5 py-20 sm:py-28">
      <div className="w-full max-w-lg text-center">
        <p className="text-eyebrow text-accent-strong font-semibold">שגיאה 404</p>
        <h1 className="text-h1 text-primary mt-4 font-bold">{UI_MESSAGES.errors.notFoundTitle}</h1>
        <Rule className="my-7" />
        <p className="text-muted-foreground text-lead leading-relaxed">
          {UI_MESSAGES.errors.notFoundBody} אם הגעתם לכאן מקישור להזמנה, בקשו מבעלי השמחה קישור
          מעודכן.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonClass({ size: 'lg' })}>
            לדף הבית
          </Link>
          <Link href="/login" className={buttonClass({ variant: 'outline', size: 'lg' })}>
            כניסה לחשבון
          </Link>
        </div>
      </div>
    </main>
  );
}
