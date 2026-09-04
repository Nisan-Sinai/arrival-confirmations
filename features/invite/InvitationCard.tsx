import { TZDate } from '@date-fns/tz';
import { HDate } from '@hebcal/core';

import { buttonClass } from '@/components/ui/button';
import { EVENT_TIMEZONE } from '@/config/event.config';
import { getEventTypePreset } from '@/config/eventTypes';
import { UI_MESSAGES } from '@/config/messages';
import { AddToCalendar } from '@/features/invite/AddToCalendar';
import { Countdown } from '@/features/invite/Countdown';
import {
  Balloons,
  Bunting,
  CornerFiligree,
  FloralSprig,
  GiftAndShoes,
  TeddyBear,
  WatercolourWash,
} from '@/features/invite/Ornaments';
import type { PublicEvent } from '@/repositories/eventRepository';

/**
 * The invitation card (§5).
 *
 * Modelled on the printed invitation the host supplied: a double gold rule, ב"ה at
 * the head, the occasion set large in navy, gold flourishes as separators, and the
 * three practical facts — when, what time, where — in a row of medallions.
 *
 * Everything decorative is CSS or inline SVG. No illustration files, for three
 * reasons that all matter here: an invitation opened on cellular data should not wait
 * on half a megabyte of artwork, §12 rules out layout shift, and every ornament stays
 * crisp on a phone screen at any density. It also keeps the page free of external
 * requests, which §4.2 requires of anything that can carry an invitation URL.
 */

const HEBREW_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const;

/**
 * §5: dates render in Asia/Jerusalem unconditionally, never in the viewer's zone.
 * A relative reading the invitation from abroad must not be told 04:00.
 */
function formatGregorian(isoDate: string): { weekday: string; date: string } {
  const zoned = new TZDate(`${isoDate}T00:00:00`, EVENT_TIMEZONE);
  const weekday = HEBREW_WEEKDAYS[zoned.getDay()] ?? '';
  const date = new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: EVENT_TIMEZONE,
  }).format(zoned);
  return { weekday: `ביום ${weekday}`, date };
}

function formatHebrewDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new HDate(new Date(year!, month! - 1, day!)).renderGematriya(true);
}

const formatTime = (time: string | null): string | null =>
  time === null ? null : time.slice(0, 5);

/** A gold flourish. Decorative only, so it is hidden from assistive technology. */
function Flourish({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`} aria-hidden="true">
      <span className="from-accent/0 to-accent/70 h-px w-20 bg-gradient-to-l" />
      <svg viewBox="0 0 24 24" className="fill-accent size-3" role="presentation">
        <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" />
      </svg>
      <span className="from-accent/0 to-accent/70 h-px w-20 bg-gradient-to-r" />
    </div>
  );
}

/** One of the three medallions: an icon in a gold ring above its facts. */
function Medallion({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 px-2 text-center">
      <span
        className="border-accent/60 text-primary flex size-11 items-center justify-center rounded-full border"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="text-primary text-sm leading-relaxed font-semibold sm:text-base">
        {children}
      </div>
    </div>
  );
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'size-5',
  role: 'presentation' as const,
};

export function InvitationCard({ event }: { event: PublicEvent }) {
  const preset = getEventTypePreset(event.event_type);
  const { weekday, date } = formatGregorian(event.event_date!);
  const ceremonyTime = formatTime(event.ceremony_time);
  const receptionTime = formatTime(event.reception_time);
  // Resolved here, not in the browser: the countdown must run against Asia/Jerusalem
  // regardless of where the guest's phone thinks it is.
  const countdownTargetMs = new TZDate(
    `${event.event_date}T${event.ceremony_time ?? '12:00:00'}`,
    EVENT_TIMEZONE,
  ).getTime();

  return (
    <article className="relative mx-auto w-full max-w-2xl overflow-hidden">
      <WatercolourWash />
      {/* Outer gold rule, then an inset second rule — the double frame of the print. */}
      <div className="border-accent/70 rounded-lg border-2 p-2 sm:p-3">
        <div className="border-accent/40 from-secondary/20 relative overflow-hidden rounded-md border bg-gradient-to-b via-white/95 to-white/95 px-4 pt-12 pb-20 sm:px-12 sm:pt-14 sm:pb-24">
          {/* Four corners from one shape, rotated. */}
          <CornerFiligree className="absolute top-1 right-1 size-14 opacity-70 sm:size-16" />
          <CornerFiligree className="absolute top-1 left-1 size-14 -scale-x-100 opacity-70 sm:size-16" />
          <CornerFiligree className="absolute right-1 bottom-1 size-14 -scale-y-100 opacity-70 sm:size-16" />
          <CornerFiligree className="absolute bottom-1 left-1 size-14 -scale-100 opacity-70 sm:size-16" />

          <Bunting className="pointer-events-none absolute -top-1 left-1 w-28 opacity-80 sm:w-56 sm:opacity-90" />
          <Balloons className="pointer-events-none absolute top-4 right-0 w-14 opacity-80 sm:top-6 sm:right-1 sm:w-28 sm:opacity-95" />
          <TeddyBear className="pointer-events-none absolute right-1 -bottom-2 w-24 opacity-95 sm:w-32" />
          <GiftAndShoes className="pointer-events-none absolute bottom-0 left-0 w-16 opacity-85 sm:left-1 sm:w-32 sm:opacity-95" />
          <FloralSprig className="pointer-events-none absolute bottom-14 left-0 hidden w-16 opacity-75 sm:block sm:w-20" />

          <div className="relative z-10">
            <p className="text-muted-foreground text-center text-sm">ב״ה</p>

            <p className="text-foreground mt-8 text-center text-base leading-relaxed sm:text-lg">
              {preset.blessingLine}
              <br />
              {preset.invitationLine}
            </p>

            <h1 className="text-primary mt-6 text-center font-[family-name:var(--font-display)] text-[2.6rem] leading-[1.05] font-bold tracking-tight drop-shadow-sm sm:text-6xl">
              {preset.label}
            </h1>

            {/*
              The standalone "של" that used to sit here was a duplicate. Every
              `invitationLine` already ends with the relation word — "…לברית המילה של
              בננו" for a brit, "…לחתונה של" for a wedding — so the card read
              "…של בננו · של · בננו היקר". The presets are written to be followed
              directly by the honoree, and the same pairing is what `generateMetadata`
              and the WhatsApp template use.
            */}
            <p className="text-primary mt-5 text-center font-[family-name:var(--font-display)] text-2xl font-bold sm:text-4xl">
              {event.honoree_display_name}
            </p>

            <Flourish className="my-8 sm:my-9" />

            {/* The three practical facts, side by side as on the print. On a narrow
              phone they stack rather than shrink past legibility (§9, 200% zoom). */}
            <div className="flex flex-col items-stretch gap-8 sm:flex-row sm:gap-4">
              <Medallion
                icon={
                  <svg {...iconProps}>
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M8 3v4M16 3v4M3 10h18" />
                  </svg>
                }
              >
                {weekday}
                <br />
                {formatHebrewDate(event.event_date!)}
                <br />
                <span className="text-muted-foreground font-normal">{date}</span>
              </Medallion>

              {ceremonyTime !== null && (
                <>
                  <span className="bg-accent/30 hidden w-px sm:block" aria-hidden="true" />
                  <Medallion
                    icon={
                      <svg {...iconProps}>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                    }
                  >
                    <span className="text-muted-foreground font-normal">
                      {preset.ceremonyTimeLabel}
                    </span>
                    <br />
                    {ceremonyTime}
                    {receptionTime !== null && (
                      <>
                        <br />
                        <span className="text-muted-foreground font-normal">
                          קבלת פנים {receptionTime}
                        </span>
                      </>
                    )}
                  </Medallion>
                </>
              )}

              <span className="bg-accent/30 hidden w-px sm:block" aria-hidden="true" />
              <Medallion
                icon={
                  <svg {...iconProps}>
                    <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                }
              >
                {event.venue_name}
                <br />
                <span className="text-muted-foreground font-normal">{event.address}</span>
              </Medallion>
            </div>

            <Flourish className="my-8 sm:my-9" />

            <Countdown targetMs={countdownTargetMs} />

            <Flourish className="my-8 sm:my-9" />

            {event.description !== null && (
              <p className="text-foreground text-center text-base leading-relaxed whitespace-pre-line sm:text-lg">
                {event.description}
              </p>
            )}

            <p className="text-muted-foreground mt-8 text-center text-base">בברכה,</p>
            <p className="text-primary text-center font-[family-name:var(--font-display)] text-2xl font-bold">
              {event.hosts_names}
            </p>

            {(event.waze_url !== null || event.google_maps_url !== null) && (
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                {event.waze_url !== null && (
                  <a
                    className={buttonClass({ variant: 'gold', size: 'sm' })}
                    href={event.waze_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    ניווט ב-Waze <span className="sr-only"> ({UI_MESSAGES.a11y.externalLink})</span>
                  </a>
                )}
                {event.google_maps_url !== null && (
                  <a
                    className={buttonClass({ variant: 'outline', size: 'sm' })}
                    href={event.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Maps <span className="sr-only"> ({UI_MESSAGES.a11y.externalLink})</span>
                  </a>
                )}
              </div>
            )}

            {/* PLAN §5 lists this beside the navigation buttons; it had never been
                built. A guest who confirms three months out has nowhere to put the
                date except their own memory. */}
            <div className="mt-4">
              <AddToCalendar
                uid={event.public_id!}
                title={`${preset.label} — ${event.honoree_display_name}`}
                date={event.event_date!}
                time={event.ceremony_time}
                venueName={event.venue_name!}
                address={event.address!}
              />
            </div>

            {/* On a phone the card is taller than the viewport, so the guest arrives
                at an invitation with no visible indication that there is anything to
                do. This is the call to action, and it is the only element on the card
                that is filled rather than outlined. */}
            <div className="mt-9 flex justify-center">
              <a href="#rsvp" className={buttonClass({ size: 'lg' })}>
                {UI_MESSAGES.rsvp.submit}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </a>
            </div>

            {event.contact_phone !== null && (
              <p className="text-muted-foreground mt-7 text-center text-sm">
                לשאלות:{' '}
                <a
                  className="text-primary font-semibold underline underline-offset-2"
                  href={`tel:${event.contact_phone.replace(/[^\d+]/g, '')}`}
                  dir="ltr"
                >
                  {event.contact_phone}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
