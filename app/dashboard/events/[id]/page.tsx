import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';
import { getEventTypePreset } from '@/config/eventTypes';
import { UI_MESSAGES } from '@/config/messages';
import { RsvpRow } from '@/features/admin/RsvpRow';
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
 * A statistic, sized by how much it matters.
 *
 * The head count the caterer needs and the number of replies are not peers of "how
 * many babies", and a row of eight identical tiles said they were. `emphasis` is the
 * whole difference between a dashboard you can scan and a dashboard you have to read.
 */
function Stat({
  label,
  value,
  emphasis = false,
  hint,
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
  hint?: string;
}) {
  return (
    <Card
      variant={emphasis ? 'accent' : 'paper'}
      padding="none"
      className="flex flex-col justify-between p-4 sm:p-5"
    >
      <p className="text-muted-foreground text-xs sm:text-sm">{label}</p>
      <p
        className={
          emphasis
            ? 'text-primary mt-2 font-[family-name:var(--font-display)] text-4xl leading-none font-bold tabular-nums'
            : 'text-primary mt-2 font-[family-name:var(--font-display)] text-2xl leading-none font-bold tabular-nums'
        }
      >
        {value}
      </p>
      {hint !== undefined && <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>}
    </Card>
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
      'id, public_id, title, event_type, event_date, venue_name, honoree_display_name, is_active',
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
  const rate = computeResponseRate(guests ?? [], rows);
  const preset = getEventTypePreset(event.event_type);

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="wide">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 rounded-sm text-sm"
        >
          {/* The arrow points right, because "back" in an RTL document is rightwards.
              A left-pointing chevron here is the single most common RTL mistake. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          כל האירועים
        </Link>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-eyebrow text-accent-strong font-semibold">{preset.label}</p>
            <h1 className="text-h1 text-primary mt-2 font-bold">{event.title}</h1>
            <p className="text-muted-foreground mt-2">
              יום {formatEventWeekday(event.event_date)}, {formatEventDate(event.event_date)} ·{' '}
              {event.venue_name}
              <span className="text-accent-strong">
                {' '}
                · {describeTimeUntilEvent(event.event_date)}
              </span>
            </p>
          </div>
          <Link
            href={`/dashboard/events/${event.id}/edit`}
            className={buttonClass({ variant: 'outline' })}
          >
            עריכת ההזמנה
          </Link>
        </header>

        <div className="mt-9">
          <ShareInvitation
            publicId={event.public_id}
            origin={await resolveRequestOrigin()}
            blessingLine={preset.blessingLine}
            invitationLine={preset.invitationLine}
            honoree={event.honoree_display_name}
          />
        </div>

        {/* The two numbers a host opens this page for, then the breakdown. */}
        <div className="mt-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="סה״כ צפויים להגיע"
            value={stats.expectedAttendees}
            emphasis
            hint="המספר שהקייטרינג צריך"
          />
          <Stat
            label="תשובות שהתקבלו"
            value={stats.total}
            emphasis
            hint={`${stats.receivedToday} היום`}
          />
          <Stat label="מגיעים" value={stats.attending} />
          <Stat label="לא מגיעים" value={stats.notAttending} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="מתלבטים" value={stats.maybe} />
          <Stat label="מבוגרים" value={stats.adults} />
          <Stat label="ילדים" value={stats.children} />
          <Stat
            label="אחוז מענה"
            // §8.1: with no guest list there is no denominator, so no percentage.
            value={
              rate.percentage === null
                ? UI_MESSAGES.admin.responseRateUnavailable
                : `${rate.percentage}%`
            }
            hint={rate.percentage === null ? 'אין רשימת מוזמנים' : `מתוך ${rate.invited} מוזמנים`}
          />
        </div>

        <section aria-labelledby="replies" className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="replies" className="text-h2 text-primary font-bold">
              התשובות
            </h2>
            {rows.length > 0 && (
              <p className="text-muted-foreground text-sm">
                {stats.babies > 0 && `כולל ${stats.babies} תינוקות · `}
                המספרים בסוגריים: מבוגרים / ילדים / תינוקות
              </p>
            )}
          </div>

          {rows.length === 0 ? (
            <EmptyState
              className="mt-5"
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
                  <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9.5" cy="7" r="4" />
                  <path d="M19 8v6M22 11h-6" />
                </svg>
              }
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
             * on a phone. The list below reflows instead: stacked with a visible label
             * per datum on a phone, aligned into columns under the header at lg.
             */
            <>
              <div
                aria-hidden="true"
                className="text-muted-foreground mt-5 hidden grid-cols-[1.4fr_1.1fr_0.8fr_0.9fr_1.5fr_auto] gap-4 border-b px-3 pb-2.5 text-xs font-semibold lg:grid"
              >
                <span>שם</span>
                <span>טלפון</span>
                <span>סטטוס</span>
                <span>כמות</span>
                <span>תזונה והערות</span>
                <span className="w-20 text-end">פעולות</span>
              </div>
              <ul className="mt-3 space-y-3 lg:mt-0 lg:space-y-0">
                {rows.map((rsvp) => (
                  <RsvpRow key={rsvp.id} rsvp={rsvp} eventId={event.id} />
                ))}
              </ul>
            </>
          )}
        </section>
      </Container>
    </main>
  );
}
