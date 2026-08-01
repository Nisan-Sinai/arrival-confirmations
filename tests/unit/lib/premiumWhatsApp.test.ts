import { describe, expect, it } from 'vitest';

import {
  buildPremiumWhatsAppMessage,
  buildWhatsAppSendUrl,
  filterPremiumCampaignGuests,
  normalizeWhatsAppPhone,
  type PremiumCampaignGuest,
} from '@/lib/premiumWhatsApp';

const guests: readonly PremiumCampaignGuest[] = [
  {
    id: 'guest-1',
    fullName: 'ישראל ישראלי',
    phone: '050-1234567',
    attendanceStatus: null,
  },
  {
    id: 'guest-2',
    fullName: 'שרה כהן',
    phone: '+972521234567',
    attendanceStatus: 'attending',
  },
  {
    id: 'guest-3',
    fullName: 'משה לוי',
    phone: '053-7654321',
    attendanceStatus: 'not_attending',
  },
];

describe('Premium personal WhatsApp campaigns', () => {
  it('normalizes common Israeli phone formats for WhatsApp links', () => {
    expect(normalizeWhatsAppPhone('050-1234567')).toBe('972501234567');
    expect(normalizeWhatsAppPhone('+972 52 123 4567')).toBe('972521234567');
    expect(normalizeWhatsAppPhone('00972-53-7654321')).toBe('972537654321');
  });

  it('rejects numbers that cannot be sent through the Israeli campaign', () => {
    expect(normalizeWhatsAppPhone('123')).toBeNull();
    expect(normalizeWhatsAppPhone('00123456789')).toBeNull();
  });

  it('builds separate personalized invitation and reminder messages', () => {
    const invitation = buildPremiumWhatsAppMessage({
      kind: 'invitation',
      guestName: 'ישראל',
      eventTitle: 'החתונה של דנה ויוסי',
      inviteUrl: 'https://example.com/e/abc',
    });
    const reminder = buildPremiumWhatsAppMessage({
      kind: 'reminder',
      guestName: 'ישראל',
      eventTitle: 'החתונה של דנה ויוסי',
      inviteUrl: 'https://example.com/e/abc',
    });

    expect(invitation).toContain('שלום ישראל');
    expect(invitation).toContain('נשמח להזמין אותך');
    expect(invitation).toContain('https://example.com/e/abc');
    expect(reminder).toContain('תזכורת לגבי');
    expect(reminder).not.toBe(invitation);
  });

  it('creates a direct WhatsApp URL only for a valid phone', () => {
    const url = buildWhatsAppSendUrl('050-1234567', 'שלום עולם');
    expect(url).toBe('https://api.whatsapp.com/send?phone=972501234567&text=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%A2%D7%95%D7%9C%D7%9D');
    expect(buildWhatsAppSendUrl('invalid', 'שלום')).toBeNull();
  });

  it('filters unanswered guests and applies name search', () => {
    expect(filterPremiumCampaignGuests(guests, 'unanswered', new Set())).toEqual([guests[0]]);
    expect(filterPremiumCampaignGuests(guests, 'all', new Set(), 'שרה')).toEqual([guests[1]]);
    expect(filterPremiumCampaignGuests(guests, 'all', new Set(), '7654')).toEqual([guests[2]]);
  });

  it('filters guests already marked as sent without affecting the full list', () => {
    const sent = new Set(['guest-1', 'guest-3']);
    expect(filterPremiumCampaignGuests(guests, 'not_sent', sent)).toEqual([guests[1]]);
    expect(filterPremiumCampaignGuests(guests, 'all', sent)).toEqual(guests);
  });
});
