'use client';

import { useMemo } from 'react';

import { buttonClass } from '@/components/ui/button';
import { getAppCopy } from '@/config/appCopy';
import { getDictionary } from '@/config/dictionary';
import { defaultLocale, type Locale } from '@/lib/i18n';

interface AddToCalendarProps {
  readonly uid: string;
  readonly title: string;
  readonly date: string;
  readonly time: string | null;
  readonly venueName: string;
  readonly address: string;
  readonly locale?: Locale;
}

const TZID = 'Asia/Jerusalem';
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0300',
  'TZNAME:IDT',
  'DTSTART:19700327T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1FR',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0300',
  'TZOFFSETTO:+0200',
  'TZNAME:IST',
  'DTSTART:19701025T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
].join('\r\n');

function stamp(date: string, time: string | null): string {
  return `${date.replaceAll('-', '')}T${(time ?? '19:00:00').slice(0, 8).replaceAll(':', '')}`;
}

function addHours(date: string, time: string | null, hours: number): string {
  const [h = 19, m = 0] = (time ?? '19:00:00').split(':').map(Number);
  const shifted = new Date(Date.UTC(2000, 0, 1, h + hours, m));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.replaceAll('-', '')}T${pad(shifted.getUTCHours())}${pad(shifted.getUTCMinutes())}00`;
}

const escapeText = (value: string): string =>
  value.replace(/[\\;,]/g, (match) => `\\${match}`).replace(/\r?\n/g, '\\n');

export function AddToCalendar({
  uid,
  title,
  date,
  time,
  venueName,
  address,
  locale = defaultLocale,
}: AddToCalendarProps) {
  const location = `${venueName}, ${address}`;
  const start = stamp(date, time);
  const end = addHours(date, time, 4);
  const copy = getAppCopy(locale).invitation;
  const dictionary = getDictionary(locale);

  const icsHref = useMemo(() => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//arrival-confirmations//${locale.toUpperCase()}`,
      'CALSCALE:GREGORIAN',
      VTIMEZONE,
      'BEGIN:VEVENT',
      `UID:${start}-${uid}@arrival-confirmations`,
      `DTSTAMP:${start}Z`,
      `DTSTART;TZID=${TZID}:${start}`,
      `DTEND;TZID=${TZID}:${end}`,
      `SUMMARY:${escapeText(title)}`,
      `LOCATION:${escapeText(location)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
  }, [start, end, title, location, uid, locale]);

  const googleHref = useMemo(() => {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${start}/${end}`,
      ctz: TZID,
      location,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, [start, end, title, location]);

  return (
    <div className="flex flex-wrap justify-center gap-3">
      <a
        href={icsHref}
        download="event.ics"
        className={buttonClass({ variant: 'outline', size: 'sm' })}
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
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18M12 14v4M10 16h4" />
        </svg>
        {copy.addToCalendar}
      </a>
      <a
        href={googleHref}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass({ variant: 'ghost', size: 'sm' })}
      >
        {copy.googleCalendar}
        <span className="sr-only"> ({dictionary.a11y.externalLink})</span>
      </a>
    </div>
  );
}
