import 'server-only';

import type { PremiumMessageKind } from '@/lib/premiumWhatsApp';

export const WHATSAPP_BATCH_SIZE = 20;

const TEMPLATE_ENV_BY_KIND: Record<PremiumMessageKind, string> = {
  invitation: 'WHATSAPP_TEMPLATE_INVITATION',
  reminder: 'WHATSAPP_TEMPLATE_REMINDER',
  update: 'WHATSAPP_TEMPLATE_UPDATE',
  thanks: 'WHATSAPP_TEMPLATE_THANKS',
};

export interface WhatsAppCloudConfig {
  readonly accessToken: string;
  readonly phoneNumberId: string;
  readonly graphVersion: string;
  readonly languageCode: string;
  readonly templates: Readonly<Record<PremiumMessageKind, string>>;
}

export interface WhatsAppTemplatePayloadInput {
  readonly kind: PremiumMessageKind;
  readonly recipientPhone: string;
  readonly guestName: string;
  readonly eventTitle: string;
  readonly invitationUrl: string | null;
  readonly note?: string;
  readonly templateName: string;
  readonly languageCode: string;
}

export interface WhatsAppSendResult {
  readonly providerMessageId: string | null;
}

function nonEmpty(value: string | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized === '' ? null : normalized;
}

export function readWhatsAppCloudConfig(source: Record<string, string | undefined> = process.env): {
  readonly config: WhatsAppCloudConfig | null;
  readonly missing: readonly string[];
} {
  const accessToken = nonEmpty(source.WHATSAPP_ACCESS_TOKEN);
  const phoneNumberId = nonEmpty(source.WHATSAPP_PHONE_NUMBER_ID);
  const languageCode = nonEmpty(source.WHATSAPP_LANGUAGE_CODE) ?? 'he';
  const graphVersion = nonEmpty(source.WHATSAPP_GRAPH_VERSION) ?? 'v23.0';
  const missing: string[] = [];

  if (accessToken === null) missing.push('WHATSAPP_ACCESS_TOKEN');
  if (phoneNumberId === null) missing.push('WHATSAPP_PHONE_NUMBER_ID');

  const templates = {} as Record<PremiumMessageKind, string>;
  for (const [kind, envName] of Object.entries(TEMPLATE_ENV_BY_KIND) as [
    PremiumMessageKind,
    string,
  ][]) {
    const value = nonEmpty(source[envName]);
    if (value === null) missing.push(envName);
    else templates[kind] = value;
  }

  if (missing.length > 0 || accessToken === null || phoneNumberId === null) {
    return { config: null, missing };
  }

  return {
    config: {
      accessToken,
      phoneNumberId,
      graphVersion,
      languageCode,
      templates,
    },
    missing: [],
  };
}

function recipientDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

function bodyParameters(input: WhatsAppTemplatePayloadInput): readonly {
  readonly type: 'text';
  readonly text: string;
}[] {
  if (input.kind === 'thanks') {
    return [
      { type: 'text', text: input.guestName },
      { type: 'text', text: input.eventTitle },
    ];
  }

  if (input.invitationUrl === null) {
    throw new Error('personal_invitation_url_required');
  }

  if (input.kind === 'update') {
    return [
      { type: 'text', text: input.guestName },
      { type: 'text', text: input.eventTitle },
      { type: 'text', text: input.note?.trim() || 'פרטי האירוע עודכנו.' },
      { type: 'text', text: input.invitationUrl },
    ];
  }

  return [
    { type: 'text', text: input.guestName },
    { type: 'text', text: input.eventTitle },
    { type: 'text', text: input.invitationUrl },
  ];
}

export function buildWhatsAppTemplatePayload(input: WhatsAppTemplatePayloadInput) {
  return {
    messaging_product: 'whatsapp' as const,
    to: recipientDigits(input.recipientPhone),
    type: 'template' as const,
    template: {
      name: input.templateName,
      language: { code: input.languageCode },
      components: [
        {
          type: 'body' as const,
          parameters: bodyParameters(input),
        },
      ],
    },
  };
}

export async function testWhatsAppSenderConnection(input: {
  readonly accessToken: string;
  readonly phoneNumberId: string;
  readonly graphVersion: string;
}): Promise<{ readonly displayPhoneNumber: string; readonly verifiedName: string | null }> {
  const response = await fetch(
    `https://graph.facebook.com/${input.graphVersion}/${input.phoneNumberId}?fields=display_phone_number,verified_name`,
    {
      headers: { authorization: `Bearer ${input.accessToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    readonly display_phone_number?: unknown;
    readonly verified_name?: unknown;
    readonly error?: { readonly code?: number };
  } | null;

  if (!response.ok) {
    const providerCode = payload?.error?.code;
    throw new Error(
      providerCode === undefined
        ? `whatsapp_http_${response.status}`
        : `whatsapp_http_${response.status}_code_${providerCode}`,
    );
  }

  if (typeof payload?.display_phone_number !== 'string') {
    throw new Error('whatsapp_invalid_sender_response');
  }

  return {
    displayPhoneNumber: payload.display_phone_number,
    verifiedName: typeof payload.verified_name === 'string' ? payload.verified_name : null,
  };
}

export async function sendWhatsAppTemplate(
  config: WhatsAppCloudConfig,
  input: Omit<WhatsAppTemplatePayloadInput, 'templateName' | 'languageCode'>,
): Promise<WhatsAppSendResult> {
  const response = await fetch(
    `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(
        buildWhatsAppTemplatePayload({
          ...input,
          templateName: config.templates[input.kind],
          languageCode: config.languageCode,
        }),
      ),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    readonly messages?: readonly { readonly id?: string }[];
    readonly error?: { readonly code?: number };
  } | null;

  if (!response.ok) {
    const providerCode = payload?.error?.code;
    throw new Error(
      providerCode === undefined
        ? `whatsapp_http_${response.status}`
        : `whatsapp_http_${response.status}_code_${providerCode}`,
    );
  }

  return { providerMessageId: payload?.messages?.[0]?.id ?? null };
}
