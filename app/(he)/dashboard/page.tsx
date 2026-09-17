import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getEventLicenses, trialEventLicense } from '@/app/_lib/eventLicenses';
import { getPlanLabel, isMonetizedEvent } from '@/app/_lib/plans';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/icons';
import { Container } from '@/components/ui/layout';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat';
import { UI_MESSAGES } from '@/config/messages';
import { getEventTypePreset } from '@/config/eventTypes';
import { DateTile } from '@/features/admin/DateTile';
import { EventManagementActions } from '@/features/admin/EventManagementActions';
import {
  daysUntilEvent,
  describeTimeUntilEvent,
  formatEventDate,
  formatEventWeekday,
} from '@/lib/eventDate';
import { resolveRequestOrigin } from '@/lib/server/origin';
import { createUserClient } from '@/lib/server/supabase';
import { supportWhatsAppUrl } from '@/lib/supportContact';

export const metadata: Metadata = {
  title: 'האירועים שלי',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function licenseTone(status: string): 'success' | 'warning' | 'danger' | 'gold' | 'neutral' {
  if (status === 'active' || status === 'legacy') return 'success';
  if (status === 'trial') return 'gold';
  if (status === 'pending_payment') return 'warning';
  if (status === 'cancelled' || status === 'refunded') return 'danger';
  return 'neutral';
}

function licenseStatusLabel(status: string): string {
  if (status === 'active') return 'פעיל';
  if (status === 'trial') return 'בדיקה';
  if (status === 'pending_payment') return 'ממתין לתשלום';
  if (status === 'cancelled') return 'בוטל';
  if (status === 'refunded') return 'הוחזר';
  return 'פעיל ללא חיוב';
}

export default async function DashboardPage() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect('/login');

  const { data: events } = await supabase
    .from('events')
    .select('id, public_id, title, event_type, event_date, venue_name, is_active, created_at')
    .order('event_date', { ascending: true });

  const rows = events ?? [];
  const licenses = await getEventLicenses(rows.map((event) => event.id));
  for (const event of rows) {
    const current = licenses.get(event.id);
    if (current?.changedAt === null && isMonetizedEvent(event.created_at)) {
      licenses.set(event.id, trialEventLicense(event.id));
    }
  }

  const origin = await resolveRequestOrigin();
  const whatsappUrl = supportWhatsAppUrl(
    'שלום ניסן, אני רוצה להפעיל מסלול לאירוע שיצרתי במערכת אישורי הגעה.',
  );

  const published = rows.filter((event) => event.is_active).length;
  const upcoming = rows.filter((event) => {
    const days = daysUntilEvent(event.event_date);
    return days !== null && days >= 0;
  });
  const next = upcoming[0];

  return (
    <main id="main" className="flex-1 py-8 sm:py-12">
      <Container width="app">
        <PageHeader
          eyebrow="לוח הבקרה"
          title="האירועים שלי"
          lede="מכל כרטיס נכנסים לניהול מלא, עורכים את ההזמנה, צופים בה, מעתיקים את הקישור או פותחים הודעת WhatsApp מוכנה לשליחה."
          actions={
            rows.length > 0 ? (
              <Link href="/dashboard/events/new" className={buttonClass()}>
                <Icon name="plus" strokeWidth={2.2} />
                אירוע חדש
              </Link>
            ) : undefined
          }
        />

        {rows.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="אירועים" value={rows.length} icon={<Icon name="calendar" />} />
            <StatCard
              label="מפורסמים"
              value={published}
              hint={
                published === rows.length
                  ? 'כל ההזמנות פתוחות לאורחים'
                  : `${rows.length - published} בטיוטה`
              }
              icon={<Icon name="eye" />}
            />
            <StatCard
              className="col-span-2 sm:col-span-1"
              label="האירוע הקרוב"
              value={next === undefined ? '—' : describeTimeUntilEvent(next.event_date)}
              hint={next === undefined ? 'אין אירועים עתידיים' : next.title}
              icon={<Icon name="clock" />}
            />
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState
            className="mt-10"
            icon={<Icon name="calendar-plus" strokeWidth={1.5} className="size-6" />}
            title="עדיין אין לכם אירועים"
            description="צרו את האירוע הראשון, עצבו אותו ובדקו עד 10 אישורי הגעה ללא תשלום."
            action={
              <Link href="/dashboard/events/new" className={buttonClass({ size: 'lg' })}>
                <Icon name="plus" strokeWidth={2.2} />
                יצירת האירוע הראשון
              </Link>
            }
          />
        ) : (
          <ul className="mt-8 grid gap-4 lg:grid-cols-2">
            {rows.map((event) => {
              const license = licenses.get(event.id);
              const plan = license?.plan ?? 'legacy';
              const status = license?.status ?? 'legacy';
              const needsActivation = status === 'trial' || status === 'pending_payment';
              const days = daysUntilEvent(event.event_date);
              const past = days !== null && days < 0;

              return (
                <li key={event.id}>
                  <Card interactive padding="md" className="flex h-full flex-col">
                    <div className="flex items-start gap-4">
                      <DateTile isoDate={event.event_date} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={event.is_active ? 'success' : 'warning'} dot>
                            {event.is_active ? 'מפורסם' : 'טיוטה'}
                          </Badge>
                          <Badge tone={licenseTone(status)}>
                            {getPlanLabel(plan)} · {licenseStatusLabel(status)}
                          </Badge>
                        </div>
                        <h2 className="text-primary mt-2 text-xl leading-snug font-bold">
                          <Link
                            href={`/dashboard/events/${event.id}`}
                            className="rounded-sm underline-offset-4 hover:underline"
                          >
                            {event.title}
                          </Link>
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {getEventTypePreset(event.event_type).label}
                        </p>
                      </div>
                    </div>

                    <dl className="text-muted-foreground mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                      <div className="flex items-center gap-1.5">
                        <dt className="sr-only">מתי</dt>
                        <Icon name="calendar" className="text-accent-strong size-4" />
                        <dd>
                          יום {formatEventWeekday(event.event_date)},{' '}
                          {formatEventDate(event.event_date)}
                        </dd>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <dt className="sr-only">איפה</dt>
                        <Icon name="map-pin" className="text-accent-strong size-4" />
                        <dd>{event.venue_name}</dd>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <dt className="sr-only">מתי ביחס להיום</dt>
                        <Icon name="clock" className="text-accent-strong size-4" />
                        <dd className={past ? undefined : 'text-primary font-semibold'}>
                          {describeTimeUntilEvent(event.event_date)}
                        </dd>
                      </div>
                    </dl>

                    {needsActivation && (
                      <div className="border-accent-strong/25 bg-warning-soft/70 mt-4 flex flex-col gap-3 rounded-xl border p-3.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-accent-foreground font-semibold">
                            {status === 'trial' ? 'האירוע במצב בדיקה' : 'ממתין להפעלת מסלול'}
                          </p>
                          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                            בדיקה חינמית מוגבלת ל-10 אישורי הגעה. להפעלה מלאה בחרו מסלול וצרו קשר.
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Link
                            href="/pricing"
                            className={buttonClass({ variant: 'outline', size: 'sm' })}
                          >
                            מסלולים
                          </Link>
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonClass({ variant: 'gold', size: 'sm' })}
                          >
                            <Icon name="whatsapp" />
                            הפעלה
                            <span className="sr-only">({UI_MESSAGES.a11y.externalLink})</span>
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="mt-auto">
                      <EventManagementActions
                        eventId={event.id}
                        eventTitle={event.title}
                        publicId={event.public_id}
                        origin={origin}
                      />
                    </div>
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
