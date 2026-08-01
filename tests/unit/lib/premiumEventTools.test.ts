import { describe, expect, it } from 'vitest';

import {
  brandingCssVariables,
  buildWhatsAppCloudPayload,
  DEFAULT_EVENT_BRANDING,
  isHexColor,
  isInvitationStyle,
  isWhatsAppLanguageCode,
  isWhatsAppTemplateName,
  normalizeHttpsUrl,
  parsePublicBranding,
  parseScheduleDate,
  seatingSummary,
  whatsappRecipient,
} from '@/lib/premiumEventTools';

describe('premium event tools', () => {
  it('validates six-digit HEX colors', () => {
    expect(isHexColor(' #a1B2c3 ')).toBe(true);
    expect(isHexColor('#fff')).toBe(false);
    expect(isHexColor('red')).toBe(false);
  });

  it('accepts only HTTPS URLs and treats an empty value as no logo', () => {
    expect(normalizeHttpsUrl('')).toBeNull();
    expect(normalizeHttpsUrl(' https://example.com/logo.png ')).toBe(
      'https://example.com/logo.png',
    );
    expect(normalizeHttpsUrl('http://example.com/logo.png')).toBeNull();
    expect(normalizeHttpsUrl('not a url')).toBeNull();
  });

  it('recognises invitation styles, template names and language codes', () => {
    expect(isInvitationStyle('classic')).toBe(true);
    expect(isInvitationStyle('modern')).toBe(true);
    expect(isInvitationStyle('minimal')).toBe(true);
    expect(isInvitationStyle('loud')).toBe(false);

    expect(isWhatsAppTemplateName('event_invitation_he')).toBe(true);
    expect(isWhatsAppTemplateName('Event Invitation')).toBe(false);
    expect(isWhatsAppTemplateName('')).toBe(false);

    expect(isWhatsAppLanguageCode('he')).toBe(true);
    expect(isWhatsAppLanguageCode('en_US')).toBe(true);
    expect(isWhatsAppLanguageCode('he-il')).toBe(false);
  });

  it('parses the fixed public branding shape and falls back safely', () => {
    expect(parsePublicBranding(null)).toEqual(DEFAULT_EVENT_BRANDING);
    expect(parsePublicBranding([])).toEqual(DEFAULT_EVENT_BRANDING);
    expect(
      parsePublicBranding({
        primary_color: '#abcdef',
        accent_color: '#123456',
        logo_url: 'https://example.com/logo.png',
        invitation_style: 'modern',
      }),
    ).toEqual({
      primaryColor: '#ABCDEF',
      accentColor: '#123456',
      logoUrl: 'https://example.com/logo.png',
      invitationStyle: 'modern',
    });
    expect(
      parsePublicBranding({
        primary_color: 42,
        accent_color: 'invalid',
        logo_url: 'http://example.com/logo.png',
        invitation_style: 'unknown',
      }),
    ).toEqual(DEFAULT_EVENT_BRANDING);
    expect(
      parsePublicBranding({
        primary_color: '#000000',
        accent_color: '#FFFFFF',
        logo_url: 3,
        invitation_style: 'minimal',
      }),
    ).toEqual({
      primaryColor: '#000000',
      accentColor: '#FFFFFF',
      logoUrl: null,
      invitationStyle: 'minimal',
    });
    expect(
      parsePublicBranding({
        primary_color: '#010203',
        accent_color: 42,
        logo_url: null,
        invitation_style: 42,
      }),
    ).toEqual({
      primaryColor: '#010203',
      accentColor: DEFAULT_EVENT_BRANDING.accentColor,
      logoUrl: null,
      invitationStyle: DEFAULT_EVENT_BRANDING.invitationStyle,
    });
  });

  it('builds the Meta WhatsApp template payload', () => {
    expect(whatsappRecipient('+972501234567')).toBe('972501234567');
    expect(whatsappRecipient('972501234567')).toBe('972501234567');
    expect(
      buildWhatsAppCloudPayload({
        templateName: 'event_invitation_he',
        languageCode: 'he',
        recipientPhone: '+972501234567',
        guestName: 'ישראל ישראלי',
        eventTitle: 'החתונה',
        invitationUrl: 'https://example.com/e/abcdefghij12',
      }),
    ).toEqual({
      messaging_product: 'whatsapp',
      to: '972501234567',
      type: 'template',
      template: {
        name: 'event_invitation_he',
        language: { code: 'he' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'ישראל ישראלי' },
              { type: 'text', text: 'החתונה' },
              { type: 'text', text: 'https://example.com/e/abcdefghij12' },
            ],
          },
        ],
      },
    });
  });

  it('accepts current and future schedules but rejects invalid and old dates', () => {
    const now = new Date('2026-08-01T18:00:00.000Z');
    expect(parseScheduleDate('not-a-date', now)).toBeNull();
    expect(parseScheduleDate('2026-08-01T17:58:00.000Z', now)).toBeNull();
    expect(parseScheduleDate('2026-08-01T17:59:30.000Z', now)?.toISOString()).toBe(
      '2026-08-01T17:59:30.000Z',
    );
    expect(parseScheduleDate('2026-08-02T18:00:00.000Z', now)?.toISOString()).toBe(
      '2026-08-02T18:00:00.000Z',
    );
  });

  it('creates CSS variables and a sorted seating summary', () => {
    expect(
      brandingCssVariables({
        primaryColor: '#111111',
        accentColor: '#222222',
        logoUrl: null,
        invitationStyle: 'classic',
      }),
    ).toEqual({ '--event-primary': '#111111', '--event-accent': '#222222' });

    expect(
      seatingSummary([
        { tableName: 'שולחן ב', partySize: 2 },
        { tableName: 'שולחן א', partySize: 3 },
        { tableName: 'שולחן א', partySize: 1 },
        { tableName: '  ', partySize: 4 },
        { tableName: null, partySize: 1 },
      ]),
    ).toEqual([
      { tableName: 'ללא שולחן', seats: 5 },
      { tableName: 'שולחן א', seats: 4 },
      { tableName: 'שולחן ב', seats: 2 },
    ]);
  });
});
