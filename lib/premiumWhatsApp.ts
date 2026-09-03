import { prefixHebrew } from '@/lib/hebrew';

/**
 * The four things a host has to say to a guest list, in the order they say them.
 *
 * `invitation` and `reminder` were here from the start. The other two close the gap
 * either side of them:
 *
 *   - `update` is the one whose absence does damage rather than merely missing an
 *     opportunity. An event moves — a hall changes, a brit shifts by a day — and until
 *     now there was no way to tell the people who had already said yes. Every other
 *     RSVP service in this market has it, and they all have it because it happens.
 *   - `thanks` is the note the morning after. Cheap to send, and the only message in
 *     the set a guest is pleased rather than obliged to receive.
 */
export const PREMIUM_MESSAGE_KINDS = ['invitation', 'reminder', 'update', 'thanks'] as const;
export type PremiumMessageKind = (typeof PREMIUM_MESSAGE_KINDS)[number];

/**
 * `attending` exists because the two new kinds are addressed to a different list.
 *
 * An invitation goes to whoever has not answered. A change of venue goes to the people
 * who said they were coming — telling someone who declined that the hall has moved is
 * noise, and a thank-you to someone who was not there reads as a mistake.
 */
export const PREMIUM_CAMPAIGN_SCOPES = ['unanswered', 'not_sent', 'attending', 'all'] as const;
export type PremiumCampaignScope = (typeof PREMIUM_CAMPAIGN_SCOPES)[number];

export type PremiumAttendanceStatus = 'attending' | 'not_attending' | 'maybe' | null;

export interface PremiumCampaignGuest {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string;
  readonly attendanceStatus: PremiumAttendanceStatus;
}

export function normalizeWhatsAppPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  let normalized = digits;

  if (normalized.startsWith('00')) normalized = normalized.slice(2);
  if (normalized.startsWith('0')) normalized = `972${normalized.slice(1)}`;

  if (!/^972[1-9][0-9]{7,8}$/.test(normalized)) return null;
  return normalized;
}

/**
 * One message, addressed to one guest.
 *
 * `note` carries what actually changed for an `update` — "the hall has moved to X", "we
 * have put it back a week". It is the host's own words rather than a template, because
 * a generic "there has been a change" makes a guest open a link to find out what, and
 * some of them will not.
 *
 * `thanks` deliberately carries no link. The event is over; sending someone to an RSVP
 * form after the fact is a small insult.
 */
export function buildPremiumWhatsAppMessage({
  kind,
  guestName,
  eventTitle,
  inviteUrl,
  note,
}: {
  kind: PremiumMessageKind;
  guestName: string;
  eventTitle: string;
  inviteUrl: string;
  note?: string;
}): string {
  const greeting = `שלום ${guestName} 👋`;

  if (kind === 'thanks') {
    return [
      greeting,
      `תודה שהייתם איתנו ${prefixHebrew('ב', eventTitle)} ❤️`,
      '',
      'היה לנו לעונג לחגוג יחד.',
    ].join('\n');
  }

  if (kind === 'update') {
    const trimmed = note?.trim() ?? '';
    return [
      greeting,
      `עדכון לגבי ${eventTitle}`,
      '',
      // Falls back rather than emitting a blank line: a host who left the field empty
      // still sends something coherent, and the link below carries the current details.
      trimmed === '' ? 'חלו שינויים בפרטי האירוע.' : trimmed,
      '',
      'הפרטים המעודכנים כאן:',
      inviteUrl,
    ].join('\n');
  }

  const opening =
    kind === 'invitation'
      ? `נשמח להזמין אותך ${prefixHebrew('ל', eventTitle)}`
      : `תזכורת לגבי ${eventTitle}`;

  return [greeting, opening, '', 'לכל הפרטים ולאישור הגעה:', inviteUrl, '', 'נשמח לראותך ❤️'].join(
    '\n',
  );
}

export function buildWhatsAppSendUrl(phone: string, message: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (normalized === null) return null;

  return `https://api.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(message)}`;
}

/** A host's note about a change is one WhatsApp line, not an essay. Capped so it cannot
 * bloat a URL the invite route puts in an `?note=` parameter. */
export const PERSONAL_INVITE_NOTE_MAX = 300;

/**
 * Widen a query string back into a message kind, or nothing.
 *
 * The invite-issuing route (`/share/guest/[guestId]`) reads this off the URL to pick a
 * template. Anything it does not recognise — a stale link, a typo, an absent value —
 * falls through to the route's own default message rather than throwing, so a mangled
 * `?kind=` never turns a working send button into an error page.
 */
export function parsePremiumMessageKind(value: string | null): PremiumMessageKind | null {
  return PREMIUM_MESSAGE_KINDS.find((kind) => kind === value) ?? null;
}

/**
 * Where a bulk send button points.
 *
 * The Premium centre used to open WhatsApp directly with the *public* link, which told
 * the system nothing about who answered. It now routes every link-bearing message
 * through the same issuer the one-by-one list uses, so each guest gets a personal token
 * and the reply lands on their row. The chosen template travels as `kind`; an `update`
 * carries the host's own words in `note`, and only an `update` does — the other kinds
 * have nothing to say that the linked page does not.
 */
export function buildPersonalInviteSendPath({
  guestId,
  kind,
  note,
}: {
  guestId: string;
  kind: PremiumMessageKind;
  note?: string;
}): string {
  const params = new URLSearchParams({ kind });
  const trimmed = note?.trim() ?? '';
  if (kind === 'update' && trimmed !== '') {
    params.set('note', trimmed.slice(0, PERSONAL_INVITE_NOTE_MAX));
  }
  return `/share/guest/${guestId}?${params.toString()}`;
}

export function filterPremiumCampaignGuests<T extends PremiumCampaignGuest>(
  guests: readonly T[],
  scope: PremiumCampaignScope,
  sentGuestIds: ReadonlySet<string>,
  query = '',
): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('he-IL');

  return guests.filter((guest) => {
    if (scope === 'unanswered' && guest.attendanceStatus !== null) return false;
    if (scope === 'not_sent' && sentGuestIds.has(guest.id)) return false;
    // `maybe` is included: someone who said they might come still needs to know the
    // hall moved, and excluding them is the failure this scope exists to prevent.
    if (scope === 'attending' && guest.attendanceStatus === 'not_attending') return false;
    if (scope === 'attending' && guest.attendanceStatus === null) return false;

    if (normalizedQuery.length === 0) return true;
    return (
      guest.fullName.toLocaleLowerCase('he-IL').includes(normalizedQuery) ||
      guest.phone.includes(normalizedQuery)
    );
  });
}
