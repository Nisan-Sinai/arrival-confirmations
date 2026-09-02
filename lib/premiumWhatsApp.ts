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

export function filterPremiumCampaignGuests(
  guests: readonly PremiumCampaignGuest[],
  scope: PremiumCampaignScope,
  sentGuestIds: ReadonlySet<string>,
  query = '',
): PremiumCampaignGuest[] {
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
