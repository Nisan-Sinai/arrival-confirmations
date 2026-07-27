import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { getEventTypePreset } from '@/config/eventTypes';
import { formatEventDate, formatEventWeekday } from '@/lib/eventDate';
import type { PublicEvent } from '@/repositories/eventRepository';

/**
 * The data and the typefaces behind the share images (§12).
 *
 * Why any of this exists: the link a host sends is the moment a guest decides whether
 * to tap. A bare URL in a WhatsApp thread is indistinguishable from spam, and the
 * preview card is the only thing standing between "an unknown link" and "our
 * daughter's wedding". So the image is generated per event rather than being one
 * static product banner.
 *
 * On the fonts. `next/og` renders through Satori, which has no system fonts and no
 * Hebrew coverage of its own — an unfed Satori draws every Hebrew glyph as blank.
 * Three faces are therefore vendored under `assets/fonts/` and read from disk at
 * render time. They are static TTF instances on purpose: Satori's OpenType parser
 * cannot read a variable font's `fvar` table and throws outright on the upstream
 * Assistant variable file, which is exactly the sort of failure that would have been
 * discovered by a host whose invitation previewed as a blank rectangle.
 *
 * Reading from disk rather than fetching from Google at render time is also
 * deliberate: a preview crawler will not wait, and an external request is a way for
 * the invitation card to fail that has nothing to do with the invitation.
 *
 * A font is only half of what Satori is missing for Hebrew — it also has no
 * bidirectional algorithm and draws glyphs in memory order. Nothing here may reach the
 * renderer as a plain string; see `lib/ogText.ts`.
 */

/** WhatsApp, Facebook and iMessage all crop to roughly 1.91:1. This is that ratio. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export const OG_IMAGE_CONTENT_TYPE = 'image/png';

export interface OgFont {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: 'normal';
}

const FONT_DIR = join(process.cwd(), 'assets', 'fonts');

/**
 * Loaded once per warm serverless instance. Three files is ~160 KB of I/O, which is
 * not much, but it is the same 160 KB on every single request without this.
 */
let fontsPromise: Promise<OgFont[]> | null = null;

async function readOgFonts(): Promise<OgFont[]> {
  const [regular, bold, display] = await Promise.all([
    readFile(join(FONT_DIR, 'Assistant-Regular.ttf')),
    readFile(join(FONT_DIR, 'Assistant-Bold.ttf')),
    readFile(join(FONT_DIR, 'FrankRuhlLibre-Bold.ttf')),
  ]);

  return [
    { name: 'Assistant', data: regular, weight: 400, style: 'normal' },
    { name: 'Assistant', data: bold, weight: 700, style: 'normal' },
    { name: 'Frank Ruhl Libre', data: display, weight: 700, style: 'normal' },
  ];
}

export function loadOgFonts(): Promise<OgFont[]> {
  fontsPromise ??= readOgFonts();
  return fontsPromise;
}

/**
 * What the invitation's share card says.
 *
 * Separated from the drawing so the wording is unit-testable without rendering a
 * PNG, and so the fallbacks are visible: every field an image reads is nullable in
 * `public_event_v2`, and a share card is the last place that should print "null".
 */
export interface InvitationOgFields {
  readonly blessing: string;
  readonly invitation: string;
  readonly honoree: string;
  /** Point size for the headline — see `honoreeFontSize`. */
  readonly honoreeSize: number;
  readonly weekday: string;
  readonly date: string;
  readonly time: string;
  readonly venue: string;
}

/** `'19:30:00'` → `'19:30'`; anything unusable → `''`. */
function formatOgTime(time: string | null): string {
  if (time === null || !/^\d{2}:\d{2}/.test(time)) return '';
  return time.slice(0, 5);
}

/**
 * Satori has no equivalent of `fit-text`: a font size is a number decided before
 * anything is measured. "דנה ויונתן" and "משפחות כהן־אברמוביץ׳ ולוי־בן־שמעון" are both
 * legitimate values for the same field, and one size cannot serve both — the first set
 * small looks like a mistake, the second set large wraps into four lines and pushes
 * the date off the card.
 *
 * The steps are chosen so each band fills roughly the same width at 1200px, and the
 * floor is still comfortably legible in a WhatsApp thumbnail.
 */
export function honoreeFontSize(honoree: string): number {
  if (honoree.length <= 14) return 92;
  if (honoree.length <= 24) return 72;
  if (honoree.length <= 36) return 54;
  return 42;
}

export function buildInvitationOgFields(event: PublicEvent): InvitationOgFields {
  const preset = getEventTypePreset(event.event_type);

  // The honoree is the headline. When the column is empty the hosts' names are the
  // next most meaningful thing to set large; falling through to the event-type label
  // is the last resort, so the card never renders with a hole where the name goes.
  const honoree = event.honoree_display_name ?? event.hosts_names ?? preset.label;

  // A blank weekday is `formatEventWeekday`'s answer for "not a usable date", and it
  // is the one gate for the whole date row — `formatEventDate` answers '—' instead,
  // which would print an em dash on the card.
  const weekday = formatEventWeekday(event.event_date);
  const headline = honoree === '' ? preset.label : honoree;

  return {
    blessing: preset.blessingLine,
    invitation: preset.invitationLine,
    honoree: headline,
    honoreeSize: honoreeFontSize(headline),
    weekday: weekday === '' ? '' : `יום ${weekday}`,
    date: weekday === '' ? '' : formatEventDate(event.event_date),
    // Matches the invitation card, which leads with the ceremony and treats the
    // reception as the secondary line.
    time: formatOgTime(event.ceremony_time ?? event.reception_time),
    venue: event.venue_name ?? '',
  };
}
