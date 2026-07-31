import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getEventLicenses, trialEventLicense } from '@/app/_lib/eventLicenses';
import { getPlanLabel, isMonetizedEvent } from '@/app/_lib/plans';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';
import { appConfig } from '@/config/event.config';
import { getEventTypePreset } from '@/config/eventTypes';
import { describeTimeUntilEvent, formatEventDate, formatEventWeekday } from '@/lib/eventDate';
import { createUserClient } from '@/lib/server/supabase';

export const metadata: Metadata = {
  title: 'האירועים שלי',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function whatsappPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
}

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

  const whatsappUrl = `https://wa.me/${whatsappPhone(appConfig.supportPhone)}?text=${encodeURIComponent(
    'שלום ניסן, אני רוצה להפעיל מסלול לאירוע שיצרתי במערכת אישורי הגעה.',
  )}`;

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="app">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow text-accent-strong font-semibold">לוח הבקרה</p>
            <h1 className="text-h1 text-primary mt-2 font-bold">האירועים שלי</h1>
          </div>
          {rows.length > 0 && (
            <p className="text-muted-foreground text-sm">
              {rows.length === 1 ? 'אירוע אחד' : `${rows.length} אירועים`}
            </p>
          )}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            className="mt-10"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-6"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18M12 14v4M10 16h4" />
              </svg>
            }
            title="עדיין אין לכם אירועים"
            description="צרו את האירוע הראשון, עצבו אותו ובדקו עד 10 אישורי הגעה ללא תשלום."
            action={
              <Link href="/dashboard/events/new" className={buttonClass({ size: 'lg' })}>
                יצירת האירוע הראשון
              </Link>
            }
          />
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {rows.map((event) => {
              const license = licenses.get(event.id);
              const plan = license?.plan ?? 'legacy';
              const status = license?.status ?? 'legacy';
              const needsActivation = status === 'trial' || status === 'pending_payment';

              return (
                <li key={event.id}>
                  <Card interactive padding="md" className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-h3 text-primary font-semibold">
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
                      <div className="flex flex-col items-end gap-2">
                        <Badge tone={event.is_active ? 'success' : 'warning'}>
                          {event.is_active ? 'מפורסם' : 'טיוטה'}
                        </Badge>
                        <Badge tone={licenseTone(status)}>
                          {getPlanLabel(plan)} · {licenseStatusLabel(status)}
                        </Badge>
                      </div>
                    </div>

                    <dl className="mt-5 space-y-1.5 text-sm">
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">מתי:</dt>
                        <dd className="text-foreground font-medium">
                          יום {formatEventWeekday(event.event_date)}, {formatEventDate(event.event_date)}
                          <span className="text-muted-foreground font-normal">
                            {' · '}
                            {describeTimeUntilEvent(event.event_date)}
                          </span>
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">איפה:</dt>
                        <dd className="text-foreground font-medium">{event.venue_name}</dd>
                      </div>
                    </dl>

                    {needsActivation && (
                      <div className="border-accent-strong/25 bg-warning-soft mt-5 rounded-xl border p-4 text-sm">
                        <p className="text-accent-foreground font-semibold">
                          {status === 'trial' ? 'האירוע במצב בדיקה' : 'ממתין להפעלת מסלול'}
                        </p>
                        <p className="text-muted-foreground mt-1 leading-relaxed">
                          בדיקה חינמית מוגבלת ל-10 אישורי הגעה. להפעלה מלאה בחרו Basic או Premium
                          וצרו קשר לתשלום.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            href="/pricing"
                            className={buttonClass({ variant: 'outline', size: 'sm' })}
                          >
                            השוואת מסלולים
                          </Link>
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonClass({ size: 'sm' })}
                          >
                            הפעלה ב-WhatsApp
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="border-border mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                      <Link
                        href={`/e/${event.public_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        prefetch={false}
                        aria-label={`פתיחת ההזמנה של ${event.title} בכרטיסייה חדשה`}
                        className="text-primary inline-flex items-center gap-1.5 rounded-sm text-sm underline underline-offset-4"
                      >
                        <span dir="ltr">/e/{event.public_id}</span>
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="size-3.5 shrink-0"
                        >
                          <path d="M14 3h7v7M10 14 21 3" />
                          <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
                        </svg>
                      </Link>
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className={buttonClass({ variant: 'outline', size: 'sm' })}
                      >
                        אישורי הגעה
                      </Link>
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
