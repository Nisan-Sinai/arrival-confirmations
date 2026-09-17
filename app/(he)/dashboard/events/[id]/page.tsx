import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { buttonClass } from '@/components/ui/button';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/icons';
import { Container } from '@/components/ui/layout';
import { BackLink, MetaItem, PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat';
import { getEventTypePreset } from '@/config/eventTypes';
import { ResponseRateTile } from '@/features/admin/ResponseRateTile';
import { RsvpList } from '@/features/admin/RsvpList';
import { ShareInvitation } from '@/features/admin/ShareInvitation';
import { describeTimeUntilEvent, formatEventDate, formatEventWeekday } from '@/lib/eventDate';
import { resolveRequestOrigin } from '@/lib/server/origin';
import { createUserClient } from '@/lib/server/supabase';
import { computeResponseRate, computeRsvpStats } from '@/services/rsvpStats';

/**
 * One event's RSVP list (§8).
 *
 * The page a host actually opens: who replied, how many are coming, and what the
 * caterer needs to know. Everything is read through the caller's own session, so RLS
 * decides what exists — a mistake here returns nothing rather than someone else's
 * guest list.
 */

export const metadata: Metadata = {
  title: 'אישורי הגעה',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * The replies as one bar, split three ways.
 *
 * Three numbers in three tiles are a table; the same three as widths on one line are a
 * picture of the event. The bar is decorative — every figure it draws is also in the
 * tiles and the chips — so it carries no text of its own.
 */
function AttendanceBar({
  attending,
  maybe,
  notAttending,
}: {
  attending: number;
  maybe: number;
  notAttending: number;
}) {
  const total = attending + maybe + notAttending;
  if (total === 0) return null;
  const width = (part: number) => `${(part / total) * 100}%`;
  return (
    <div
      aria-hidden="true"
      className="bg-border/70 mt-3 flex h-2 w-full overflow-hidden rounded-full"
    >
      <span className="bg-success h-full" style={{ width: width(attending) }} />
      <span className="bg-accent-strong h-full" style={{ width: width(maybe) }} />
      <span className="bg-destructive/80 h-full" style={{ width: width(notAttending) }} />
    </div>
  );
}

export default async function EventRsvpsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createUserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect('/login');

  // RLS scopes this to events the caller owns, so a foreign id is simply not found.
  const { data: event } = await supabase
    .from('events')
    .select(
      'id, public_id, title, event_type, event_date, venue_name, honoree_display_name, is_active, expected_guests',
    )
    .eq('id', id)
    .maybeSingle();
  if (event === null) notFound();

  const [{ data: rsvps }, { data: guests }] = await Promise.all([
    supabase
      .from('rsvps')
      .select('*')
      .eq('event_id', id)
      .order('submitted_at', { ascending: false }),
    supabase.from('guests').select('id, is_active, token_revoked_at').eq('event_id', id),
  ]);

  const rows = rsvps ?? [];
  const stats = computeRsvpStats(rows);
  // The host's own figure is the denominator when there are no per-guest rows, which
  // in this product is always — the tile read "not available" on every event until now.
  const rate = computeResponseRate(guests ?? [], rows, event.expected_guests);
  const preset = getEventTypePreset(event.event_type);

  return (
    <main id="main" className="flex-1 py-8 sm:py-12">
      <Container width="wide">
        <BackLink href="/dashboard">כל האירועים</BackLink>

        <PageHeader
          className="mt-4"
          badges={
            <>
              <Badge tone="gold">{preset.label}</Badge>
              <Badge tone={event.is_active ? 'success' : 'warning'} dot>
                {event.is_active ? 'מפורסם' : 'טיוטה'}
              </Badge>
            </>
          }
          title={event.title}
          meta={
            <>
              <MetaItem icon={<Icon name="calendar" />}>
                יום {formatEventWeekday(event.event_date)}, {formatEventDate(event.event_date)}
              </MetaItem>
              <MetaItem icon={<Icon name="map-pin" />}>{event.venue_name}</MetaItem>
              <MetaItem icon={<Icon name="clock" />} className="text-accent-strong font-semibold">
                {describeTimeUntilEvent(event.event_date)}
              </MetaItem>
            </>
          }
          actions={
            <>
              <Link
                href={`/dashboard/events/${event.id}/guests`}
                className={buttonClass({ variant: 'outline' })}
              >
                <Icon name="users" />
                מוזמנים וכלים
              </Link>
              <Link
                href={`/dashboard/events/${event.id}/edit`}
                className={buttonClass({ variant: 'outline' })}
              >
                <Icon name="edit" />
                עריכת ההזמנה
              </Link>
            </>
          }
        />

        <div className="mt-8">
          <ShareInvitation
            publicId={event.public_id}
            origin={await resolveRequestOrigin()}
            blessingLine={preset.blessingLine}
            invitationLine={preset.invitationLine}
            honoree={event.honoree_display_name}
          />
        </div>

        {/* The two numbers a host opens this page for, then the breakdown. */}
        <section aria-label="סיכום התשובות" className="mt-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="סה״כ צפויים להגיע"
              value={stats.expectedAttendees}
              emphasis
              icon={<Icon name="users" />}
              hint="המספר שהקייטרינג צריך"
            />
            <StatCard
              label="תשובות שהתקבלו"
              value={stats.total}
              emphasis
              icon={<Icon name="mail" />}
              hint={stats.receivedToday > 0 ? `${stats.receivedToday} התקבלו היום` : 'אף אחת היום'}
              footer={
                <AttendanceBar
                  attending={stats.attending}
                  maybe={stats.maybe}
                  notAttending={stats.notAttending}
                />
              }
            />
            <StatCard label="מגיעים" value={stats.attending} tone="success" />
            <StatCard label="לא מגיעים" value={stats.notAttending} tone="danger" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="מתלבטים" value={stats.maybe} tone="warning" />
            <StatCard label="מבוגרים" value={stats.adults} />
            <StatCard
              label="ילדים"
              value={stats.children}
              hint={stats.babies > 0 ? `ועוד ${stats.babies} תינוקות` : undefined}
            />
            {/* The only editable tile: its denominator is a number the host knows while
                looking at this screen, and sending them to a separate form to change it
                is what left it reading "not available" on every event. */}
            <ResponseRateTile
              eventId={event.id}
              percentage={rate.percentage}
              invited={rate.invited}
              expectedGuests={event.expected_guests}
            />
          </div>
        </section>

        <section aria-labelledby="replies" className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="replies" className="text-h2 text-primary font-bold">
              התשובות
            </h2>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              className="mt-5"
              icon={<Icon name="user-plus" strokeWidth={1.5} className="size-6" />}
              title="עדיין לא התקבלו אישורי הגעה"
              description={
                event.is_active
                  ? 'שלחו את הקישור שלמעלה בוואטסאפ, והתשובות יופיעו כאן ברגע שיגיעו.'
                  : 'ההזמנה אינה מפורסמת כרגע, כך שהקישור מחזיר 404. פרסמו אותה כדי להתחיל לאסוף תשובות.'
              }
              action={
                event.is_active ? undefined : (
                  <Link
                    href={`/dashboard/events/${event.id}/edit`}
                    className={buttonClass({ size: 'lg' })}
                  >
                    פרסום ההזמנה
                  </Link>
                )
              }
            />
          ) : (
            /*
             * One rendering of the data, not two.
             *
             * This used to be a mobile card list and a desktop table side by side,
             * both in the DOM at every width with one of them hidden — so every guest
             * was rendered twice, and a 300-reply wedding paid for 600 rows of markup
             * on a phone. The list reflows instead: stacked with a visible label per
             * datum on a phone, aligned into columns under the header at lg.
             */
            <RsvpList rows={rows} eventId={event.id} />
          )}
        </section>
      </Container>
    </main>
  );
}
