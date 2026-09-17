import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icons';
import { Container } from '@/components/ui/layout';
import { BackLink, PageHeader } from '@/components/ui/page-header';

/**
 * The frame around the event form, for creating and for editing.
 *
 * Two columns from `lg`: the form, and a short aside that answers the questions a host
 * has while filling it in — what the guests will see, what can change later, what the
 * free trial covers. The aside is sticky so the answers stay beside the field being
 * filled rather than scrolling away above it. On a phone it follows the form.
 */
const NOTES: readonly { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'eye',
    title: 'מה האורחים רואים',
    body: 'הזמנה מעוצבת עם התאריך העברי, שעות, מפה וספירה לאחור — וטופס אישור הגעה מתחתיה.',
  },
  {
    icon: 'edit',
    title: 'אפשר לשנות הכול אחר כך',
    body: 'שינויים מופיעים בהזמנה מיד, והקישור שכבר שלחתם נשאר אותו קישור.',
  },
  {
    icon: 'shield',
    title: 'פרטיות',
    body: 'הכותרת הפנימית ומספר ההזמנות שנשלחו נשארים אצלכם. האורחים רואים רק את פרטי האירוע.',
  },
];

export function EventFormPage({
  backHref,
  backLabel,
  eyebrow,
  title,
  lede,
  children,
}: {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <main id="main" className="flex-1 py-8 sm:py-12">
      <Container width="wide">
        <BackLink href={backHref}>{backLabel}</BackLink>
        <PageHeader className="mt-4" eyebrow={eyebrow} title={title} lede={lede} />

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <Card padding="lg">{children}</Card>

          <aside className="lg:sticky lg:top-24">
            <ul className="flex flex-col gap-3">
              {NOTES.map((note) => (
                <li
                  key={note.title}
                  className="border-border bg-card/70 flex items-start gap-3 rounded-2xl border p-4"
                >
                  <span
                    aria-hidden="true"
                    className="bg-accent-soft/70 text-accent-strong flex size-9 shrink-0 items-center justify-center rounded-full"
                  >
                    <Icon name={note.icon} className="size-4" />
                  </span>
                  <div>
                    <p className="text-primary text-sm font-semibold">{note.title}</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {note.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </Container>
    </main>
  );
}
