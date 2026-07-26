import { TZDate } from '@date-fns/tz';
import { HDate } from '@hebcal/core';

import { EVENT_TIMEZONE } from '@/config/event.config';
import { getEventTypePreset } from '@/config/eventTypes';
import { UI_MESSAGES } from '@/config/messages';
import { RsvpForm } from '@/features/rsvp/RsvpForm';
import { getPublicEvent, type PublicEvent } from '@/repositories/eventRepository';

/**
 * The public invitation (§5).
 *
 * A Server Component: the event is fetched during render, so a guest on a slow phone
 * receives finished HTML rather than a spinner that resolves into a card. Nothing
 * here is interactive yet — the RSVP form arrives with the rest of phase 4 — so
 * there is no reason for any of it to cost the visitor a JavaScript bundle.
 */

// The active event changes rarely and is read on every visit; a short revalidation
// window keeps the page cheap under a burst of WhatsApp traffic without staying
// stale for long after an admin edit.
export const revalidate = 60;

const HEBREW_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const;

/**
 * §5: every date a guest sees is rendered in Asia/Jerusalem, always — never in the
 * viewer's own zone. A guest reading the invitation abroad must not be told the
 * ceremony is at 04:00.
 */
function formatGregorian(isoDate: string): { weekday: string; date: string } {
  const zoned = new TZDate(`${isoDate}T00:00:00`, EVENT_TIMEZONE);
  const weekday = HEBREW_WEEKDAYS[zoned.getDay()] ?? '';
  const date = new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: EVENT_TIMEZONE,
  }).format(zoned);
  return { weekday: `יום ${weekday}`, date };
}

/** The Hebrew date, which for most guests is the one that anchors the occasion. */
function formatHebrewDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new HDate(new Date(year!, month! - 1, day!)).renderGematriya(true);
}

/** `HH:MM:SS` from Postgres, trimmed to what a guest reads. */
function formatTime(time: string | null): string | null {
  return time === null ? null : time.slice(0, 5);
}

function InvitationCard({ event }: { event: PublicEvent }) {
  const preset = getEventTypePreset(event.event_type);
  const { weekday, date } = formatGregorian(event.event_date!);
  const ceremonyTime = formatTime(event.ceremony_time);
  const receptionTime = formatTime(event.reception_time);

  return (
    <article className="border-accent/40 bg-card mx-auto w-full max-w-xl rounded-2xl border-2 p-8 shadow-lg sm:p-12">
      <p className="text-accent-foreground text-center text-sm tracking-wide sm:text-base">
        {preset.blessingLine}
      </p>

      <p className="text-muted-foreground mt-8 text-center text-base sm:text-lg">
        {event.hosts_names}
      </p>
      <p className="text-muted-foreground mt-2 text-center text-base sm:text-lg">
        {preset.invitationLine}
      </p>

      <h1 className="text-primary mt-4 text-center font-[family-name:var(--font-display)] text-4xl leading-tight font-bold sm:text-5xl">
        {event.honoree_display_name}
      </h1>

      {/* A rule in gold, purely ornamental — hidden from assistive technology. */}
      <div className="my-8 flex items-center justify-center gap-3" aria-hidden="true">
        <span className="bg-accent/50 h-px w-16" />
        <span className="bg-accent h-2 w-2 rotate-45" />
        <span className="bg-accent/50 h-px w-16" />
      </div>

      <dl className="space-y-4 text-center">
        <div>
          <dt className="text-muted-foreground text-sm">התאריך</dt>
          <dd className="text-lg font-semibold">{formatHebrewDate(event.event_date!)}</dd>
          <dd className="text-muted-foreground text-base">
            {weekday}, {date}
          </dd>
        </div>

        {ceremonyTime !== null && (
          <div>
            <dt className="text-muted-foreground text-sm">{preset.ceremonyTimeLabel}</dt>
            <dd className="text-lg font-semibold">{ceremonyTime}</dd>
          </div>
        )}

        {receptionTime !== null && (
          <div>
            <dt className="text-muted-foreground text-sm">שעת הקבלה</dt>
            <dd className="text-lg font-semibold">{receptionTime}</dd>
          </div>
        )}

        <div>
          <dt className="text-muted-foreground text-sm">המקום</dt>
          <dd className="text-lg font-semibold">{event.venue_name}</dd>
          <dd className="text-muted-foreground text-base">{event.address}</dd>
        </div>
      </dl>

      {(event.waze_url !== null || event.google_maps_url !== null) && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {event.waze_url !== null && (
            <a
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors"
              href={event.waze_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              ניווט ב-Waze
              <span className="sr-only"> ({UI_MESSAGES.a11y.externalLink})</span>
            </a>
          )}
          {event.google_maps_url !== null && (
            <a
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors"
              href={event.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Maps
              <span className="sr-only"> ({UI_MESSAGES.a11y.externalLink})</span>
            </a>
          )}
        </div>
      )}

      {event.description !== null && (
        <p className="text-muted-foreground mt-8 text-center text-base whitespace-pre-line">
          {event.description}
        </p>
      )}

      {event.contact_phone !== null && (
        <p className="text-muted-foreground mt-8 text-center text-sm">
          לשאלות:{' '}
          <a className="text-primary font-semibold underline" href={`tel:${event.contact_phone}`}>
            {event.contact_phone}
          </a>
        </p>
      )}
    </article>
  );
}

/**
 * Shown before an admin publishes an event.
 *
 * A real state with real copy, not a placeholder: a fresh deployment genuinely has
 * no active event, and a guest who arrives early should read a sentence rather than
 * an error (§0, §13).
 */
function NoActiveEvent() {
  return (
    <article className="bg-card mx-auto w-full max-w-md rounded-2xl border p-10 text-center">
      <h1 className="text-primary font-[family-name:var(--font-display)] text-2xl font-bold">
        אין אירוע פעיל כרגע
      </h1>
      <p className="text-muted-foreground mt-4 text-base">
        ההזמנה תופיע כאן ברגע שבעלי השמחה יפרסמו את פרטי האירוע.
      </p>
    </article>
  );
}

export default async function HomePage() {
  const event = await getPublicEvent();

  if (event === null) {
    return (
      <main
        id="main"
        className="from-secondary/40 flex flex-1 items-center justify-center bg-gradient-to-b to-transparent px-4 py-12"
      >
        <NoActiveEvent />
      </main>
    );
  }

  // Side labels come from the event first and the type preset second, so a host can
  // override "צד החתן" without the preset having to know about their family (§3).
  const preset = getEventTypePreset(event.event_type);

  return (
    <main
      id="main"
      className="from-secondary/40 flex flex-1 flex-col items-center gap-8 bg-gradient-to-b to-transparent px-4 py-12 sm:py-16"
    >
      <InvitationCard event={event} />
      <div className="w-full max-w-xl">
        <RsvpForm
          sideALabel={event.side_a_label ?? preset.defaultSideALabel}
          sideBLabel={event.side_b_label ?? preset.defaultSideBLabel}
        />
      </div>
    </main>
  );
}
