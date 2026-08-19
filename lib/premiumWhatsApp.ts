import { defaultLocale, type Locale } from '@/lib/i18n';

export const PREMIUM_MESSAGE_KINDS = ['invitation', 'reminder'] as const;
export type PremiumMessageKind = (typeof PREMIUM_MESSAGE_KINDS)[number];

export const PREMIUM_CAMPAIGN_SCOPES = ['unanswered', 'not_sent', 'all'] as const;
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

export function buildPremiumWhatsAppMessage({
  kind,
  guestName,
  eventTitle,
  inviteUrl,
  locale = defaultLocale,
}: {
  kind: PremiumMessageKind;
  guestName: string;
  eventTitle: string;
  inviteUrl: string;
  locale?: Locale;
}): string {
  if (locale === 'en') {
    const opening =
      kind === 'invitation'
        ? `We would love to invite you to ${eventTitle}`
        : `A reminder about ${eventTitle}`;
    return [
      `Hi ${guestName} 👋`,
      opening,
      '',
      'For all the details and to RSVP:',
      inviteUrl,
      '',
      'We would love to see you ❤️',
    ].join('\n');
  }

  const opening =
    kind === 'invitation' ? `נשמח להזמין אותך ל${eventTitle}` : `תזכורת לגבי ${eventTitle}`;
  return [
    `שלום ${guestName} 👋`,
    opening,
    '',
    'לכל הפרטים ולאישור הגעה:',
    inviteUrl,
    '',
    'נשמח לראותך ❤️',
  ].join('\n');
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
  locale: Locale = defaultLocale,
): PremiumCampaignGuest[] {
  const language = locale === 'he' ? 'he-IL' : 'en-US';
  const normalizedQuery = query.trim().toLocaleLowerCase(language);

  return guests.filter((guest) => {
    if (scope === 'unanswered' && guest.attendanceStatus !== null) return false;
    if (scope === 'not_sent' && sentGuestIds.has(guest.id)) return false;
    if (normalizedQuery.length === 0) return true;
    return (
      guest.fullName.toLocaleLowerCase(language).includes(normalizedQuery) ||
      guest.phone.includes(normalizedQuery)
    );
  });
}
