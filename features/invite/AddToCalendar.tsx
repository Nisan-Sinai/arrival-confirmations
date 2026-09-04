'use client';

import { useMemo } from 'react';

import { buttonClass } from '@/components/ui/button';
import { UI_MESSAGES } from '@/config/messages';

/**
 * "Add to calendar" (PLAN §5, listed beside the Waze and Maps buttons and never built).
 *
 * Both formats are generated in the browser from values the server already resolved.
 * The `.ics` is a data: URL rather than a route — the file is under a kilobyte and
 * assembling it client-side means no server round trip, no route to authorise, and
 * nothing to cache or invalidate when the host edits the event.
 *
 * The times arriving here are wall-clock in Asia/Jerusalem, which is why the VEVENT
 * carries `TZID=Asia/Jerusalem` and a matching VTIMEZONE rather than being converted
 * to UTC. Converting would be correct today and wrong the next time the Knesset moves
 * the DST boundary, which it has done within the lifetime of most calendars.
 */

interface AddToCalendarProps {
  /** The event's public id — a stable, non-secret token for the calendar entry's UID. */
  readonly uid: string;
  readonly title: string;
  /** `YYYY-MM-DD`, already in the event's zone. */
  readonly date: string;
  /** `HH:MM:SS` or null when the host left the ceremony time blank. */
  readonly time: string | null;
  readonly venueName: string;
  readonly address: string;
}

const TZID = 'Asia/Jerusalem';
/** Israel has observed IST/IDT on these rules since 2013. */
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

/** `2026-09-04` → `20260904`. */
function dateStamp(date: string): string {
  return date.replaceAll('-', '');
}

/** `2026-09-04` + `19:00:00` → `20260904T190000`. */
function timedStamp(date: string, time: string): string {
  return `${dateStamp(date)}T${time.slice(0, 8).replaceAll(':', '')}`;
}

/** Adds whole days without depending on the browser's local time zone. */
function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1, day! + days));
  return shifted.toISOString().slice(0, 10).replaceAll('-', '');
}

/** Adds hours to a wall-clock timestamp and rolls the date when it crosses midnight. */
function addHours(date: string, time: string, hours: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1, day!, hour! + hours, minute!));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${shifted.getUTCFullYear()}${pad(shifted.getUTCMonth() + 1)}${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}${pad(shifted.getUTCMinutes())}00`;
}

/**
 * RFC 5545 requires commas, semicolons and backslashes to be escaped inside a text
 * value, and newlines to be written as a literal `\n`. A venue called "אולמי הדר,
 * פ״ת" would otherwise split the SUMMARY into two properties and break the file.
 */
const escapeText = (value: string): string =>
  value.replace(/[\\;,]/g, (match) => `\\${match}`).replace(/\r?\n/g, '\\n');

export function AddToCalendar({ uid, title, date, time, venueName, address }: AddToCalendarProps) {
  const location = `${venueName}, ${address}`;
  const allDay = time === null;
  const start = allDay ? dateStamp(date) : timedStamp(date, time);
  const end = allDay ? addDays(date, 1) : addHours(date, time, 4);

  const icsHref = useMemo(() => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//arrival-confirmations//HE',
      'CALSCALE:GREGORIAN',
      VTIMEZONE,
      'BEGIN:VEVENT',
      // Derived from the event, never random: this component renders on the server
      // too, and a random UID would differ between the two passes and trip a
      // hydration mismatch on the href. Deriving it also means re-downloading the
      // file updates the existing calendar entry instead of creating a second one.
      `UID:${start}-${uid}@arrival-confirmations`,
      `DTSTAMP:${dateStamp(date)}T000000Z`,
      ...(allDay
        ? [`DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`]
        : [`DTSTART;TZID=${TZID}:${start}`, `DTEND;TZID=${TZID}:${end}`]),
      `SUMMARY:${escapeText(title)}`,
      `LOCATION:${escapeText(location)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    // encodeURIComponent, not btoa: the content is Hebrew, and btoa throws on any
    // code point above U+00FF.
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
  }, [allDay, date, start, end, title, location, uid]);

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
        הוספה ליומן
      </a>
      <a
        href={googleHref}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass({ variant: 'ghost', size: 'sm' })}
      >
        Google Calendar <span className="sr-only"> ({UI_MESSAGES.a11y.externalLink})</span>
      </a>
    </div>
  );
}
