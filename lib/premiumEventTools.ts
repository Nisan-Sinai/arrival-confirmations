export const INVITATION_STYLES = ['classic', 'modern', 'minimal'] as const;
export type InvitationStyle = (typeof INVITATION_STYLES)[number];

export interface EventBranding {
  readonly primaryColor: string;
  readonly accentColor: string;
  readonly logoUrl: string | null;
  readonly invitationStyle: InvitationStyle;
}

export interface WhatsAppTemplateInput {
  readonly templateName: string;
  readonly languageCode: string;
  readonly recipientPhone: string;
  readonly guestName: string;
  readonly eventTitle: string;
  readonly invitationUrl: string;
}

export interface WhatsAppCloudPayload {
  readonly messaging_product: 'whatsapp';
  readonly to: string;
  readonly type: 'template';
  readonly template: {
    readonly name: string;
    readonly language: { readonly code: string };
    readonly components: readonly [
      {
        readonly type: 'body';
        readonly parameters: readonly [
          { readonly type: 'text'; readonly text: string },
          { readonly type: 'text'; readonly text: string },
          { readonly type: 'text'; readonly text: string },
        ];
      },
    ];
  };
}

export function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

export function normalizeHttpsUrl(value: string): string | null {
  const text = value.trim();
  if (text === '') return null;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isInvitationStyle(value: string): value is InvitationStyle {
  return INVITATION_STYLES.some((style) => style === value);
}

export function isWhatsAppTemplateName(value: string): boolean {
  return /^[a-z0-9_]{1,128}$/.test(value);
}

export function isWhatsAppLanguageCode(value: string): boolean {
  return /^[a-z]{2}(?:_[A-Z]{2})?$/.test(value);
}

export function whatsappRecipient(e164: string): string {
  return e164.startsWith('+') ? e164.slice(1) : e164;
}

export function buildWhatsAppCloudPayload(input: WhatsAppTemplateInput): WhatsAppCloudPayload {
  return {
    messaging_product: 'whatsapp',
    to: whatsappRecipient(input.recipientPhone),
    type: 'template',
    template: {
      name: input.templateName,
      language: { code: input.languageCode },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: input.guestName },
            { type: 'text', text: input.eventTitle },
            { type: 'text', text: input.invitationUrl },
          ],
        },
      ],
    },
  };
}

export function parseScheduleDate(value: string, now: Date = new Date()): Date | null {
  const scheduled = new Date(value);
  if (Number.isNaN(scheduled.getTime())) return null;
  if (scheduled.getTime() < now.getTime() - 60_000) return null;
  return scheduled;
}

export function brandingCssVariables(branding: EventBranding): Record<string, string> {
  return {
    '--event-primary': branding.primaryColor,
    '--event-accent': branding.accentColor,
  };
}

export function seatingSummary(
  guests: readonly { readonly tableName: string | null; readonly partySize: number }[],
): readonly { readonly tableName: string; readonly seats: number }[] {
  const totals = new Map<string, number>();
  for (const guest of guests) {
    const tableName = guest.tableName?.trim() || 'ללא שולחן';
    totals.set(tableName, (totals.get(tableName) ?? 0) + guest.partySize);
  }
  return [...totals.entries()]
    .map(([tableName, seats]) => ({ tableName, seats }))
    .sort((left, right) => left.tableName.localeCompare(right.tableName, 'he'));
}
