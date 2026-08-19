import { TZDate } from '@date-fns/tz';
import { HDate } from '@hebcal/core';

import { buttonClass } from '@/components/ui/button';
import { getAppCopy } from '@/config/appCopy';
import { getDictionary } from '@/config/dictionary';
import { EVENT_TIMEZONE } from '@/config/event.config';
import { getEventTypePreset } from '@/config/eventTypes';
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
import { defaultLocale, languageTag, type Locale } from '@/lib/i18n';
import type { PublicEvent } from '@/repositories/eventRepository';

const HEBREW_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const;

function formatGregorian(
  isoDate: string,
  locale: Locale,
): { weekday: string; date: string } {
  const zoned = new TZDate(`${isoDate}T00:00:00`, EVENT_TIMEZONE);
  const weekday =
    locale === 'he'
      ? HEBREW_WEEKDAYS[zoned.getDay()]!
      : new Intl.DateTimeFormat(languageTag(locale), {
          weekday: 'long',
          timeZone: EVENT_TIMEZONE,
        }).format(zoned);
  const date = new Intl.DateTimeFormat(languageTag(locale), {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: EVENT_TIMEZONE,
  }).format(zoned);
  return { weekday, date };
}

function formatHebrewDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new HDate(new Date(year!, month! - 1, day!)).renderGematriya(true);
}

const formatTime = (time: string | null): string | null =>
  time === null ? null : time.slice(0, 5);

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

export function InvitationCard({
  event,
  locale = defaultLocale,
}: {
  event: PublicEvent;
  locale?: Locale;
}) {
  const preset = getEventTypePreset(event.event_type, locale);
  const copy = getAppCopy(locale).invitation;
  const dictionary = getDictionary(locale);
  const { weekday, date } = formatGregorian(event.event_date!, locale);
  const ceremonyTime = formatTime(event.ceremony_time);
  const receptionTime = formatTime(event.reception_time);
  const countdownTargetMs = new TZDate(
    `${event.event_date}T${event.ceremony_time ?? '12:00:00'}`,
    EVENT_TIMEZONE,
  ).getTime();

  return (
    <article className="relative mx-auto w-full max-w-2xl overflow-hidden">
      <WatercolourWash />
      <div className="border-accent/70 rounded-lg border-2 p-2 sm:p-3">
        <div className="border-accent/40 from-secondary/20 relative overflow-hidden rounded-md border bg-gradient-to-b via-white/95 to-white/95 px-4 pt-12 pb-20 sm:px-12 sm:pt-14 sm:pb-24">
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
            <p className="text-muted-foreground text-center text-sm">{copy.bh}</p>

            <p className="text-foreground mt-8 text-center text-base leading-relaxed sm:text-lg">
              {preset.blessingLine}
              <br />
              {preset.invitationLine}
            </p>

            <h1 className="text-primary mt-6 text-center font-[family-name:var(--font-display)] text-[2.6rem] leading-[1.05] font-bold tracking-tight drop-shadow-sm sm:text-6xl">
              {preset.label}
            </h1>

            <p className="text-primary mt-5 text-center font-[family-name:var(--font-display)] text-2xl font-bold sm:text-4xl">
              {event.honoree_display_name}
            </p>

            <Flourish className="my-8 sm:my-9" />

            <div className="flex flex-col items-stretch gap-8 sm:flex-row sm:gap-4">
              <Medallion
                icon={
                  <svg {...iconProps}>
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M8 3v4M16 3v4M3 10h18" />
                  </svg>
                }
              >
                {copy.weekdayPrefix} {weekday}
                {locale === 'he' && (
                  <>
                    <br />
                    {formatHebrewDate(event.event_date!)}
                  </>
                )}
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
                    <span dir="ltr">{ceremonyTime}</span>
                    {receptionTime !== null && (
                      <>
                        <br />
                        <span className="text-muted-foreground font-normal">
                          {copy.reception} <span dir="ltr">{receptionTime}</span>
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
            <Countdown targetMs={countdownTargetMs} locale={locale} />
            <Flourish className="my-8 sm:my-9" />

            {event.description !== null && (
              <p className="text-foreground text-center text-base leading-relaxed whitespace-pre-line sm:text-lg">
                {event.description}
              </p>
            )}

            <p className="text-muted-foreground mt-8 text-center text-base">{copy.greeting}</p>
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
                    {copy.waze}
                    <span className="sr-only"> ({dictionary.a11y.externalLink})</span>
                  </a>
                )}
                {event.google_maps_url !== null && (
                  <a
                    className={buttonClass({ variant: 'outline', size: 'sm' })}
                    href={event.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Maps
                    <span className="sr-only"> ({dictionary.a11y.externalLink})</span>
                  </a>
                )}
              </div>
            )}

            <div className="mt-4">
              <AddToCalendar
                uid={event.public_id!}
                title={`${preset.label} — ${event.honoree_display_name}`}
                date={event.event_date!}
                time={event.ceremony_time}
                venueName={event.venue_name!}
                address={event.address!}
                locale={locale}
              />
            </div>

            <div className="mt-9 flex justify-center">
              <a href="#rsvp" className={buttonClass({ size: 'lg' })}>
                {dictionary.rsvp.submit}
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
                {copy.questions}{' '}
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
