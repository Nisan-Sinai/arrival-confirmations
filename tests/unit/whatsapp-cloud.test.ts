import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildWhatsAppTemplatePayload,
  canClaimWhatsAppMessage,
  readWhatsAppCloudConfig,
  sendWhatsAppTemplate,
  testWhatsAppSenderConnection,
} from '@/app/_lib/whatsappCloud';

const base = {
  WHATSAPP_ACCESS_TOKEN: 'secret-token',
  WHATSAPP_PHONE_NUMBER_ID: '123456789',
  WHATSAPP_TEMPLATE_INVITATION: 'event_invitation_he',
  WHATSAPP_TEMPLATE_REMINDER: 'event_reminder_he',
  WHATSAPP_TEMPLATE_UPDATE: 'event_update_he',
  WHATSAPP_TEMPLATE_THANKS: 'event_thanks_he',
};

function config() {
  const result = readWhatsAppCloudConfig(base);
  if (result.config === null) throw new Error('expected WhatsApp config');
  return result.config;
}

function stubJson(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function stubInvalidJson(status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(new Response('not-json', { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WhatsApp Cloud configuration', () => {
  it('requires the sender, token and all four approved templates', () => {
    const result = readWhatsAppCloudConfig({});
    expect(result.config).toBeNull();
    expect(result.missing).toEqual([
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_TEMPLATE_INVITATION',
      'WHATSAPP_TEMPLATE_REMINDER',
      'WHATSAPP_TEMPLATE_UPDATE',
      'WHATSAPP_TEMPLATE_THANKS',
    ]);
  });

  it('uses safe defaults for language and Graph API version', () => {
    const result = readWhatsAppCloudConfig(base);
    expect(result.config).toMatchObject({
      accessToken: 'secret-token',
      phoneNumberId: '123456789',
      graphVersion: 'v23.0',
      languageCode: 'he',
      templates: {
        invitation: 'event_invitation_he',
        reminder: 'event_reminder_he',
        update: 'event_update_he',
        thanks: 'event_thanks_he',
      },
    });
    expect(result.missing).toEqual([]);
  });

  it('accepts custom language and Graph API version', () => {
    const result = readWhatsAppCloudConfig({
      ...base,
      WHATSAPP_LANGUAGE_CODE: 'en_US',
      WHATSAPP_GRAPH_VERSION: 'v25.0',
    });
    expect(result.config).toMatchObject({
      graphVersion: 'v25.0',
      languageCode: 'en_US',
    });
  });

  it('treats whitespace-only credentials as missing independently', () => {
    expect(
      readWhatsAppCloudConfig({
        ...base,
        WHATSAPP_ACCESS_TOKEN: '   ',
      }).missing,
    ).toEqual(['WHATSAPP_ACCESS_TOKEN']);

    expect(
      readWhatsAppCloudConfig({
        ...base,
        WHATSAPP_PHONE_NUMBER_ID: '   ',
      }).missing,
    ).toEqual(['WHATSAPP_PHONE_NUMBER_ID']);
  });
});

describe('WhatsApp Cloud template payloads', () => {
  it('builds an invitation with the personal RSVP URL', () => {
    const payload = buildWhatsAppTemplatePayload({
      kind: 'invitation',
      recipientPhone: '+972501234567',
      guestName: 'דוד כהן',
      eventTitle: 'החתונה',
      invitationUrl: 'https://example.test/invite/token',
      templateName: 'event_invitation_he',
      languageCode: 'he',
    });

    expect(payload.to).toBe('972501234567');
    expect(payload.template.components[0]!.parameters.map((parameter) => parameter.text)).toEqual([
      'דוד כהן',
      'החתונה',
      'https://example.test/invite/token',
    ]);
  });

  it('puts the update note before the personal URL', () => {
    const payload = buildWhatsAppTemplatePayload({
      kind: 'update',
      recipientPhone: '+972501234567',
      guestName: 'דוד',
      eventTitle: 'האירוע',
      invitationUrl: 'https://example.test/invite/token',
      note: 'עברנו אולם',
      templateName: 'event_update_he',
      languageCode: 'he',
    });

    expect(payload.template.components[0]!.parameters.map((parameter) => parameter.text)).toEqual([
      'דוד',
      'האירוע',
      'עברנו אולם',
      'https://example.test/invite/token',
    ]);
  });

  it('uses the default update note when the note is blank', () => {
    const payload = buildWhatsAppTemplatePayload({
      kind: 'update',
      recipientPhone: '+972501234567',
      guestName: 'דוד',
      eventTitle: 'האירוע',
      invitationUrl: 'https://example.test/invite/token',
      note: '   ',
      templateName: 'event_update_he',
      languageCode: 'he',
    });

    expect(payload.template.components[0]!.parameters[2]!.text).toBe('פרטי האירוע עודכנו.');
  });

  it('sends thank-you without an invitation URL', () => {
    const payload = buildWhatsAppTemplatePayload({
      kind: 'thanks',
      recipientPhone: '+972501234567',
      guestName: 'דוד',
      eventTitle: 'האירוע',
      invitationUrl: null,
      templateName: 'event_thanks_he',
      languageCode: 'he',
    });

    expect(payload.template.components[0]!.parameters.map((parameter) => parameter.text)).toEqual([
      'דוד',
      'האירוע',
    ]);
  });

  it('refuses a link-bearing template without a personal URL', () => {
    expect(() =>
      buildWhatsAppTemplatePayload({
        kind: 'reminder',
        recipientPhone: '+972501234567',
        guestName: 'דוד',
        eventTitle: 'האירוע',
        invitationUrl: null,
        templateName: 'event_reminder_he',
        languageCode: 'he',
      }),
    ).toThrow('personal_invitation_url_required');
  });
});

describe('WhatsApp sender connection test', () => {
  it('returns the verified sender details and uses bearer authorization', async () => {
    const fetchMock = stubJson({
      display_phone_number: '+972501234567',
      verified_name: 'Arrival Confirmations',
    });

    await expect(
      testWhatsAppSenderConnection({
        accessToken: 'token',
        phoneNumberId: '998877',
        graphVersion: 'v25.0',
      }),
    ).resolves.toEqual({
      displayPhoneNumber: '+972501234567',
      verifiedName: 'Arrival Confirmations',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/998877?fields=display_phone_number,verified_name',
      expect.objectContaining({
        headers: { authorization: 'Bearer token' },
        cache: 'no-store',
      }),
    );
  });

  it('keeps an absent verified name nullable', async () => {
    stubJson({ display_phone_number: '+972501234567', verified_name: 123 });
    await expect(
      testWhatsAppSenderConnection({
        accessToken: 'token',
        phoneNumberId: '998877',
        graphVersion: 'v25.0',
      }),
    ).resolves.toEqual({
      displayPhoneNumber: '+972501234567',
      verifiedName: null,
    });
  });

  it('rejects a malformed successful sender response', async () => {
    stubJson({ verified_name: 'Arrival Confirmations' });
    await expect(
      testWhatsAppSenderConnection({
        accessToken: 'token',
        phoneNumberId: '998877',
        graphVersion: 'v25.0',
      }),
    ).rejects.toThrow('whatsapp_invalid_sender_response');
  });

  it('sanitizes a Meta error with its provider code', async () => {
    stubJson({ error: { code: 100 } }, 400);
    await expect(
      testWhatsAppSenderConnection({
        accessToken: 'token',
        phoneNumberId: '998877',
        graphVersion: 'v25.0',
      }),
    ).rejects.toThrow('whatsapp_http_400_code_100');
  });

  it('sanitizes an error even when Meta returns invalid JSON', async () => {
    stubInvalidJson(503);
    await expect(
      testWhatsAppSenderConnection({
        accessToken: 'token',
        phoneNumberId: '998877',
        graphVersion: 'v25.0',
      }),
    ).rejects.toThrow('whatsapp_http_503');
  });
});

describe('WhatsApp template delivery', () => {
  const input = {
    kind: 'invitation' as const,
    recipientPhone: '+972501234567',
    guestName: 'דוד',
    eventTitle: 'האירוע',
    invitationUrl: 'https://example.test/invite/token',
  };

  it('posts the configured template and returns the provider message id', async () => {
    const fetchMock = stubJson({ messages: [{ id: 'wamid.123' }] });

    await expect(sendWhatsAppTemplate(config(), input)).resolves.toEqual({
      providerMessageId: 'wamid.123',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.facebook.com/v23.0/123456789/messages',
      expect.objectContaining({
        method: 'POST',
        headers: {
          authorization: 'Bearer secret-token',
          'content-type': 'application/json',
        },
        cache: 'no-store',
      }),
    );

    const request = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      messaging_product: 'whatsapp',
      to: '972501234567',
      template: {
        name: 'event_invitation_he',
        language: { code: 'he' },
      },
    });
  });

  it('returns null when Meta accepts a message without an id', async () => {
    stubJson({ messages: [{}] });
    await expect(sendWhatsAppTemplate(config(), input)).resolves.toEqual({
      providerMessageId: null,
    });
  });

  it('returns null when a successful response body is not JSON', async () => {
    stubInvalidJson(200);
    await expect(sendWhatsAppTemplate(config(), input)).resolves.toEqual({
      providerMessageId: null,
    });
  });

  it('sanitizes a send error with the provider code', async () => {
    stubJson({ error: { code: 131047 } }, 400);
    await expect(sendWhatsAppTemplate(config(), input)).rejects.toThrow(
      'whatsapp_http_400_code_131047',
    );
  });

  it('sanitizes a send error when the response body is not JSON', async () => {
    stubInvalidJson(503);
    await expect(sendWhatsAppTemplate(config(), input)).rejects.toThrow('whatsapp_http_503');
  });
});

describe('WhatsApp message claiming', () => {
  const now = Date.parse('2026-10-01T12:00:00.000Z');

  it('claims pending and failed rows', () => {
    expect(canClaimWhatsAppMessage('pending', null, now)).toBe(true);
    expect(canClaimWhatsAppMessage('failed', '2026-10-01T11:59:00.000Z', now)).toBe(true);
  });

  it('never re-claims a sent row', () => {
    expect(canClaimWhatsAppMessage('sent', null, now)).toBe(false);
  });

  it('leaves a fresh processing row to the request that owns it', () => {
    expect(canClaimWhatsAppMessage('processing', '2026-10-01T11:55:00.000Z', now)).toBe(false);
  });

  it('recovers an abandoned processing row', () => {
    expect(canClaimWhatsAppMessage('processing', '2026-10-01T11:50:00.000Z', now)).toBe(true);
    expect(canClaimWhatsAppMessage('processing', null, now)).toBe(true);
  });

  it('rejects unknown statuses', () => {
    expect(canClaimWhatsAppMessage('cancelled', null, now)).toBe(false);
  });
});
