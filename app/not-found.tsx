import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { UI_MESSAGES } from '@/config/messages';
import { Rule } from '@/components/ui/layout';

/**
 * The 404 page (§13).
 *
 * There was none, so every miss — a mistyped invitation id, an unpublished event, a
 * stale bookmark — rendered Next.js's built-in page: `<title>404: This page could not
 * be found.</title>`, an English sentence, a system font and an LTR divider rule, all
 * inside an `<html dir="rtl" lang="he">` shell. It also emitted a second `<title>`,
 * so the document had two.
 *
 * The copy is careful about one thing. This route answers both "no such event" and
 * "that event is not published", and the invitation page returns the same 404 for
 * either on purpose (§4.2) — telling the two apart would make the id space
 * enumerable one probe at a time. So the wording suggests asking the host rather than
 * implying the link was ever valid.
 */
export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 items-center justify-center px-5 py-20 sm:py-28">
      <div className="w-full max-w-lg text-center">
        {/*
          The oversized watermark numeral is gone, and both of its problems were the
          same problem. Visually it is the most generic thing a 404 page can contain.
          Technically it could not be made subtle *and* legible: at 128px bold it is
          large text, so WCAG 1.4.3 wants 3:1, and every alpha that looked suitably
          faint measured below it — `text-accent-strong/35` at 2.96:1, then
          `text-muted-foreground/60` at 2.68:1. Dimming text with opacity is precisely
          how contrast gets broken by accident.

          A small solid label carries the code instead. It clears 5.4:1, it matches the
          eyebrow used on every other page, and the heading below does the work the
          numeral was pretending to do.
        */}
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
