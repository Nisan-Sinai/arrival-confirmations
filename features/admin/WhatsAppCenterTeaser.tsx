import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * What a free host sees where a paying one gets the send centre.
 *
 * The centre lives on this page rather than behind the pricing wall on purpose: a locked
 * feature you can see and understand sells better than a line on a pricing table. It sits
 * directly under the one-by-one list so the contrast is the pitch — *this is that, but in
 * bulk, with the same personal links and tracking.*
 *
 * Deliberately static and inert. No guest data, no send buttons — it is a preview, and a
 * preview that half-worked would be worse than none. The one action is the way out of it.
 */
const CENTER_HIGHLIGHTS = [
  'ארבע הודעות מוכנות: הזמנה, תזכורת, עדכון על שינוי ותודה אחרי האירוע',
  'סינון אוטומטי — למשל רק מי שעדיין לא ענה',
  'זיכרון של מי כבר שלחת, כדי להמשיך מהמקום שעצרת',
  'אותם קישורים אישיים ומעקב כמו בשליחה אחד-אחד',
] as const;

export function WhatsAppCenterTeaser() {
  return (
    <Card padding="lg" className="border-accent/30 relative overflow-hidden">
      <div className="flex flex-wrap items-center gap-3">
        <span className="bg-accent-soft text-accent-strong inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          בלעדי ל-Premium
        </span>
      </div>

      <h2 className="text-h2 text-primary mt-3 font-bold">מרכז שליחה חכם ב-WhatsApp</h2>
      <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
        מה שאתם עושים עכשיו אחד-אחד, בכמות: אותם קישורים אישיים ואותו מעקב, אבל עם תבניות הודעה,
        סינון והמשך מהמקום שעצרתם. בלי חיבור API ובלי עלות הודעות.
      </p>

      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {CENTER_HIGHLIGHTS.map((highlight) => (
          <li key={highlight} className="text-primary flex items-start gap-2.5 text-sm">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent-strong mt-0.5 size-4 shrink-0"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {highlight}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Link href="/pricing" className={buttonClass({ size: 'lg' })}>
          שדרוג ל-Premium
        </Link>
      </div>
    </Card>
  );
}
