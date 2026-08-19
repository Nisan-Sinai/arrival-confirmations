import { TZDate } from '@date-fns/tz';
import { HDate } from '@hebcal/core';

import { EVENT_TIMEZONE } from '@/config/event.config';
import { defaultLocale, languageTag, type Locale } from '@/lib/i18n';

const HEBREW_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const;

function toParts(isoDate: string | null): { y: number; m: number; d: number } | null {
  if (isoDate === null || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

export function formatEventDate(
  isoDate: string | null,
  locale: Locale = defaultLocale,
): string {
  if (toParts(isoDate) === null) return '—';
  const zoned = new TZDate(`${isoDate}T00:00:00`, EVENT_TIMEZONE);
  return new Intl.DateTimeFormat(languageTag(locale), {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: EVENT_TIMEZONE,
  }).format(zoned);
}

export function formatEventWeekday(
  isoDate: string | null,
  locale: Locale = defaultLocale,
): string {
  if (toParts(isoDate) === null) return '';
  const zoned = new TZDate(`${isoDate}T00:00:00`, EVENT_TIMEZONE);
  if (locale === 'he') return HEBREW_WEEKDAYS[zoned.getDay()]!;
  return new Intl.DateTimeFormat(languageTag(locale), {
    weekday: 'long',
    timeZone: EVENT_TIMEZONE,
  }).format(zoned);
}

export function formatHebrewDate(isoDate: string | null): string {
  const parts = toParts(isoDate);
  if (parts === null) return '';
  return new HDate(new Date(parts.y, parts.m - 1, parts.d)).renderGematriya(true);
}

export function daysUntilEvent(isoDate: string | null, now: Date = new Date()): number | null {
  if (toParts(isoDate) === null) return null;
  const startOfEventDay = new TZDate(`${isoDate}T00:00:00`, EVENT_TIMEZONE).getTime();
  const todayIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const startOfToday = new TZDate(`${todayIso}T00:00:00`, EVENT_TIMEZONE).getTime();
  return Math.round((startOfEventDay - startOfToday) / 86_400_000);
}

export function describeTimeUntilEvent(
  isoDate: string | null,
  now: Date = new Date(),
  locale: Locale = defaultLocale,
): string {
  const days = daysUntilEvent(isoDate, now);
  if (days === null) return '';

  if (locale === 'en') {
    if (days < 0) return 'Event has passed';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  }

  if (days < 0) return 'האירוע עבר';
  if (days === 0) return 'היום';
  if (days === 1) return 'מחר';
  if (days === 2) return 'מחרתיים';
  return `בעוד ${days} ימים`;
}
