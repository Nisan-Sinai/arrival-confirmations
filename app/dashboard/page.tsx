import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';
import { getEventTypePreset } from '@/config/eventTypes';
import { describeTimeUntilEvent, formatEventDate, formatEventWeekday } from '@/lib/eventDate';
import { createUserClient } from '@/lib/server/supabase';

/**
 * The host's event list (§8).
 *
 * Authorisation happens here, in the server render, not in a layout and not in
 * middleware alone — §4.4 is explicit that every route performs its own check,
 * because hiding a link is not access control. RLS is the third layer: even a bug
 * here returns nothing, since the policies scope every row to the caller.
 */

export const metadata: Metadata = {
  title: 'האירועים שלי',
  robots: { index: false, follow: false },
};

// A host who just edited an event must see the edit, so nothing here is cached.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect('/login');

  // No .eq('owner_user_id', ...) needed — the policy already restricts this to the
  // caller's rows. Adding it would only hide a policy failure from the tests.
  const { data: events } = await supabase
    .from('events')
    .select('id, public_id, title, event_type, event_date, venue_name, is_active')
    .order('event_date', { ascending: true });

  const rows = events ?? [];

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
            description="צרו את האירוע הראשון, וקבלו קישור פרטי מוכן לשליחה בוואטסאפ."
            action={
              <Link href="/dashboard/events/new" className={buttonClass({ size: 'lg' })}>
                יצירת האירוע הראשון
              </Link>
            }
          />
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {rows.map((event) => (
              <li key={event.id}>
                <Card interactive padding="md" className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-h3 text-primary font-semibold">
                      {/* The whole card lifts on hover, but only the title is the
                          link: a card-wide anchor would swallow the invitation link
                          nested inside it. */}
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="rounded-sm underline-offset-4 hover:underline"
                      >
                        {event.title}
                      </Link>
                    </h2>
                    {event.is_active ? (
                      <Badge tone="success">מפורסם</Badge>
                    ) : (
                      <Badge tone="warning">טיוטה</Badge>
                    )}
                  </div>

                  <p className="text-muted-foreground mt-1 text-sm">
                    {getEventTypePreset(event.event_type).label}
                  </p>

                  <dl className="mt-5 space-y-1.5 text-sm">
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground">מתי:</dt>
                      <dd className="text-foreground font-medium">
                        {/* Not the raw `2026-09-04` this used to print on an RTL page. */}
                        יום {formatEventWeekday(event.event_date)},{' '}
                        {formatEventDate(event.event_date)}
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
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
