import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/layout';
import { AdminEventEditForm } from '@/features/admin/AdminEventEditForm';
import { localePath, type Locale } from '@/lib/i18n';
import { createPrivilegedClient } from '@/lib/server/supabase';

const COPY = {
  he: {
    back: 'חזרה לאירוע',
    eyebrow: 'עריכת אירוע לקוח',
    title: 'עריכת פרטי האירוע',
    intro: 'השינויים נשמרים ישירות באירוע של הלקוח ומשתקפים בהזמנה הציבורית ובאזור הלקוח.',
  },
  en: {
    back: 'Back to event',
    eyebrow: 'Edit customer event',
    title: 'Edit event details',
    intro: 'Changes are saved directly to the customer event and appear in the public invitation and customer area.',
  },
} as const;

export async function AdminEventEditPage({
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
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="card">
        <Link
          href={localePath(locale, `/admin/events/${id}`)}
          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 rounded-sm text-sm"
        >
          {copy.back}
        </Link>
        <div className="mt-4">
          <p className="text-eyebrow text-accent-strong font-semibold">{copy.eyebrow}</p>
          <h1 className="text-h1 text-primary mt-2 font-bold">{copy.title}</h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">{copy.intro}</p>
        </div>
        <Card padding="lg" className="mt-8">
          <AdminEventEditForm event={event} />
        </Card>
      </Container>
    </main>
  );
}
