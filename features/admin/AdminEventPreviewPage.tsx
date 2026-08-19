import Link from 'next/link';
import { notFound } from 'next/navigation';

import { buttonClass } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { InvitationCard } from '@/features/invite/InvitationCard';
import { localePath, type Locale } from '@/lib/i18n';
import { createPrivilegedClient } from '@/lib/server/supabase';

const COPY = {
  he: {
    back: 'חזרה לאירוע',
    eyebrow: 'תצוגה מקדימה כמנהל',
    title: 'כך ההזמנה נראית לאורחים',
    openPublic: 'פתיחת ההזמנה הציבורית',
  },
  en: {
    back: 'Back to event',
    eyebrow: 'Admin preview',
    title: 'This is how guests see the invitation',
    openPublic: 'Open public invitation',
  },
} as const;

export async function AdminEventPreviewPage({
  params,
  locale,
}: {
  readonly params: Promise<{ id: string }>;
  readonly locale: Locale;
}) {
  const copy = COPY[locale];
  const { id } = await params;
  const db = createPrivilegedClient();
  const { data: event } = await db.from('events').select('*').eq('id', id).maybeSingle();
  if (event === null) notFound();

  return (
    <main id="main" className="flex-1 py-8 sm:py-12">
      <Container width="wide">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href={localePath(locale, `/admin/events/${id}`)}
              className="text-muted-foreground hover:text-primary inline-flex rounded-sm text-sm"
            >
              {copy.back}
            </Link>
            <p className="text-eyebrow text-accent-strong mt-4 font-semibold">{copy.eyebrow}</p>
            <h1 className="text-h2 text-primary mt-2 font-bold">{copy.title}</h1>
          </div>
          <a
            href={localePath(locale, `/e/${event.public_id}`)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: 'outline' })}
          >
            {copy.openPublic}
          </a>
        </div>
        <InvitationCard event={event} locale={locale} />
      </Container>
    </main>
  );
}
