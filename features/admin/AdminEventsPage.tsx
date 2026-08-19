import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getEventLicenses, trialEventLicense } from '@/app/_lib/eventLicenses';
import { getPlanLabel, isMonetizedEvent } from '@/app/_lib/plans';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';
import { getEventTypePreset } from '@/config/eventTypes';
import { formatEventDate, formatEventWeekday } from '@/lib/eventDate';
import { localePath, type Locale } from '@/lib/i18n';
import { createPrivilegedClient } from '@/lib/server/supabase';

const COPY = {
  he: {
    eyebrow: 'מנהל מערכת',
    title: 'אירועי לקוחות',
    intro: 'תצוגה מלאה של האירועים במערכת. אפשר להיכנס לאירוע לקוח, לצפות בנתונים, לנהל מוזמנים ולערוך פרטים.',
    count: (n: number) => `${n} אירועים`,
    emptyTitle: 'אין אירועים במערכת',
    emptyBody: 'כאשר לקוחות ייצרו אירועים הם יופיעו כאן.',
    published: 'מפורסם',
    draft: 'טיוטה',
    owner: 'לקוח',
    date: 'תאריך',
    venue: 'מקום',
    open: 'פתיחת אירוע',
  },
  en: {
    eyebrow: 'Platform admin',
    title: 'Customer events',
    intro: 'A complete view of events in the system. Open a customer event to inspect data, manage guests and edit event details.',
    count: (n: number) => `${n} events`,
    emptyTitle: 'There are no events in the system',
    emptyBody: 'Customer events will appear here after they are created.',
    published: 'Published',
    draft: 'Draft',
    owner: 'Customer',
    date: 'Date',
    venue: 'Venue',
    open: 'Open event',
  },
} as const;

function licenseTone(status: string): 'success' | 'warning' | 'danger' | 'gold' | 'neutral' {
  if (status === 'active' || status === 'legacy') return 'success';
  if (status === 'trial') return 'gold';
  if (status === 'pending_payment') return 'warning';
  if (status === 'cancelled' || status === 'refunded') return 'danger';
  return 'neutral';
}

export async function AdminEventsPage({ locale }: { readonly locale: Locale }) {
  const copy = COPY[locale];
  const db = createPrivilegedClient() as unknown as SupabaseClient;
  const { data, error } = await db
    .from('events')
    .select('id, owner_user_id, title, event_type, event_date, venue_name, is_active, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Admin events query failed: ${error.code}`);

  const rows = (data ?? []) as Array<{
    id: string;
    owner_user_id: string;
    title: string;
    event_type: string;
    event_date: string;
    venue_name: string;
    is_active: boolean;
    created_at: string;
  }>;
  const licenses = await getEventLicenses(rows.map((event) => event.id));
  for (const event of rows) {
    const current = licenses.get(event.id);
    if (current?.changedAt === null && isMonetizedEvent(event.created_at)) {
      licenses.set(event.id, trialEventLicense(event.id));
    }
  }

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="wide">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow text-accent-strong font-semibold">{copy.eyebrow}</p>
            <h1 className="text-h1 text-primary mt-2 font-bold">{copy.title}</h1>
            <p className="text-muted-foreground mt-3 max-w-3xl leading-relaxed">{copy.intro}</p>
          </div>
          <p className="text-muted-foreground text-sm">{copy.count(rows.length)}</p>
        </div>

        {rows.length === 0 ? (
          <EmptyState className="mt-10" title={copy.emptyTitle} description={copy.emptyBody} />
        ) : (
          <ul className="mt-8 grid gap-4 lg:grid-cols-2">
            {rows.map((event) => {
              const license = licenses.get(event.id);
              const plan = license?.plan ?? 'legacy';
              const status = license?.status ?? 'legacy';
              return (
                <li key={event.id}>
                  <Card padding="md" className="h-full">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-h3 text-primary truncate font-semibold">{event.title}</h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {getEventTypePreset(event.event_type, locale).label}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Badge tone={event.is_active ? 'success' : 'warning'}>
                          {event.is_active ? copy.published : copy.draft}
                        </Badge>
                        <Badge tone={licenseTone(status)}>{getPlanLabel(plan, locale)}</Badge>
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">{copy.owner}</dt>
                        <dd className="text-foreground mt-0.5 truncate font-medium" dir="ltr">
                          {event.owner_user_id}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{copy.date}</dt>
                        <dd className="text-foreground mt-0.5 font-medium">
                          {formatEventWeekday(event.event_date, locale)}, {formatEventDate(event.event_date, locale)}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">{copy.venue}</dt>
                        <dd className="text-foreground mt-0.5 font-medium">{event.venue_name}</dd>
                      </div>
                    </dl>

                    <Link
                      href={localePath(locale, `/admin/events/${event.id}`)}
                      className={`${buttonClass({ size: 'sm' })} mt-5`}
                    >
                      {copy.open}
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </main>
  );
}
