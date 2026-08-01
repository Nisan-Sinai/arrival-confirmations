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
}: {
  kind: PremiumMessageKind;
  guestName: string;
  eventTitle: string;
  inviteUrl: string;
}): string {
  const opening = kind === 'invitation' ? `נשמח להזמין אותך ל${eventTitle}` : `תזכורת לגבי ${eventTitle}`;

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
): PremiumCampaignGuest[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('he-IL');

  return guests.filter((guest) => {
    if (scope === 'unanswered' && guest.attendanceStatus !== null) return false;
    if (scope === 'not_sent' && sentGuestIds.has(guest.id)) return false;

    if (normalizedQuery.length === 0) return true;
    return (
      guest.fullName.toLocaleLowerCase('he-IL').includes(normalizedQuery) ||
      guest.phone.includes(normalizedQuery)
    );
  });
}
