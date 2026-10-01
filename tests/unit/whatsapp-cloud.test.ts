import { describe, expect, it } from 'vitest';

import { buildWhatsAppTemplatePayload, readWhatsAppCloudConfig } from '@/app/_lib/whatsappCloud';

const base = {
  WHATSAPP_ACCESS_TOKEN: 'secret-token',
  WHATSAPP_PHONE_NUMBER_ID: '123456789',
  WHATSAPP_TEMPLATE_INVITATION: 'event_invitation_he',
  WHATSAPP_TEMPLATE_REMINDER: 'event_reminder_he',
  WHATSAPP_TEMPLATE_UPDATE: 'event_update_he',
  WHATSAPP_TEMPLATE_THANKS: 'event_thanks_he',
};

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
