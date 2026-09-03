import { describe, expect, it } from 'vitest';

import {
  buildPersonalInviteSendPath,
  buildPremiumWhatsAppMessage,
  buildWhatsAppSendUrl,
  filterPremiumCampaignGuests,
  normalizeWhatsAppPhone,
  parsePremiumMessageKind,
  PERSONAL_INVITE_NOTE_MAX,
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
    expect(url).toBe(
      'https://api.whatsapp.com/send?phone=972501234567&text=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%A2%D7%95%D7%9C%D7%9D',
    );
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

/**
 * The two kinds that close the gap either side of an invitation.
 *
 * `update` is the one whose absence does damage: an event moves and nobody who already
 * said yes is told. `thanks` is the note the morning after.
 */
describe('update and thank-you broadcasts', () => {
  it("carries the host's own words about what changed", () => {
    const message = buildPremiumWhatsAppMessage({
      kind: 'update',
      guestName: 'שרה כהן',
      eventTitle: 'ברית המילה',
      inviteUrl: 'https://example.test/e/abc',
      note: 'האולם עבר לרחוב הרצל 4',
    });

    expect(message).toContain('שלום שרה כהן');
    expect(message).toContain('עדכון לגבי ברית המילה');
    expect(message).toContain('האולם עבר לרחוב הרצל 4');
    expect(message).toContain('https://example.test/e/abc');
  });

  it('still says something coherent when the host left the note blank', () => {
    for (const note of [undefined, '', '   ']) {
      const message = buildPremiumWhatsAppMessage({
        kind: 'update',
        guestName: 'שרה',
        eventTitle: 'החתונה',
        inviteUrl: 'https://example.test/e/abc',
        note,
      });

      expect(message, String(note)).toContain('חלו שינויים בפרטי האירוע.');
      expect(message, String(note)).toContain('https://example.test/e/abc');
    }
  });

  it('sends no link with a thank-you, because the event is over', () => {
    const message = buildPremiumWhatsAppMessage({
      kind: 'thanks',
      guestName: 'משה לוי',
      eventTitle: 'בר המצווה',
      inviteUrl: 'https://example.test/e/abc',
    });

    expect(message).toContain('תודה שהייתם איתנו בבר המצווה');
    expect(message).not.toContain('https://example.test/e/abc');
    expect(message).not.toContain('אישור הגעה');
  });

  it('leaves the invitation and reminder wording untouched', () => {
    const invitation = buildPremiumWhatsAppMessage({
      kind: 'invitation',
      guestName: 'דן',
      eventTitle: 'החתונה',
      inviteUrl: 'https://example.test/e/abc',
    });

    expect(invitation).toContain('נשמח להזמין אותך לחתונה');
    expect(invitation).toContain('לכל הפרטים ולאישור הגעה:');
  });
});

/**
 * Routing a bulk send through the personal-link issuer is the whole fix: the centre used
 * to send the public link and learn nothing about who replied.
 */
describe('personal-link routing for the send centre', () => {
  it('recognises every real message kind and rejects anything else', () => {
    expect(parsePremiumMessageKind('invitation')).toBe('invitation');
    expect(parsePremiumMessageKind('reminder')).toBe('reminder');
    expect(parsePremiumMessageKind('update')).toBe('update');
    expect(parsePremiumMessageKind('thanks')).toBe('thanks');
    expect(parsePremiumMessageKind('nonsense')).toBeNull();
    expect(parsePremiumMessageKind(null)).toBeNull();
  });

  it('points a link-bearing send at the issuer with the chosen template', () => {
    expect(buildPersonalInviteSendPath({ guestId: 'g1', kind: 'invitation' })).toBe(
      '/share/guest/g1?kind=invitation',
    );
    expect(buildPersonalInviteSendPath({ guestId: 'g2', kind: 'reminder' })).toBe(
      '/share/guest/g2?kind=reminder',
    );
  });

  it("carries the host's own words only for an update", () => {
    expect(
      buildPersonalInviteSendPath({ guestId: 'g3', kind: 'update', note: 'האולם עבר להרצל 4' }),
    ).toBe(
      '/share/guest/g3?kind=update&note=%D7%94%D7%90%D7%95%D7%9C%D7%9D+%D7%A2%D7%91%D7%A8+%D7%9C%D7%94%D7%A8%D7%A6%D7%9C+4',
    );
    // A note on any other kind is dropped: the invitation and reminder have no free text.
    expect(
      buildPersonalInviteSendPath({ guestId: 'g4', kind: 'invitation', note: 'ignored' }),
    ).toBe('/share/guest/g4?kind=invitation');
    // An empty or whitespace note leaves the update with no parameter to carry.
    expect(buildPersonalInviteSendPath({ guestId: 'g5', kind: 'update', note: '   ' })).toBe(
      '/share/guest/g5?kind=update',
    );
  });

  it('caps a runaway note so it cannot bloat the URL', () => {
    const path = buildPersonalInviteSendPath({
      guestId: 'g6',
      kind: 'update',
      note: 'x'.repeat(PERSONAL_INVITE_NOTE_MAX + 50),
    });
    const note = new URL(path, 'https://example.test').searchParams.get('note');
    expect(note).toHaveLength(PERSONAL_INVITE_NOTE_MAX);
  });
});

describe('the attending scope', () => {
  it('reaches everyone who said yes or maybe, and nobody who declined', () => {
    const reached = filterPremiumCampaignGuests(guests, 'attending', new Set());

    expect(reached.map((guest) => guest.id)).toEqual(['guest-2']);
  });

  it('includes a guest who is still undecided', () => {
    const withMaybe = [
      ...guests,
      { id: 'guest-4', fullName: 'נועה', phone: '0541234567', attendanceStatus: 'maybe' as const },
    ];

    expect(
      filterPremiumCampaignGuests(withMaybe, 'attending', new Set()).map((guest) => guest.id),
    ).toEqual(['guest-2', 'guest-4']);
  });

  it('excludes anyone who never answered, who has nothing to be updated about', () => {
    const reached = filterPremiumCampaignGuests(guests, 'attending', new Set());

    expect(reached.some((guest) => guest.attendanceStatus === null)).toBe(false);
  });

  it('still honours the name search', () => {
    const withMaybe = [
      ...guests,
      { id: 'guest-4', fullName: 'נועה', phone: '0541234567', attendanceStatus: 'maybe' as const },
    ];

    expect(
      filterPremiumCampaignGuests(withMaybe, 'attending', new Set(), 'נועה').map((g) => g.id),
    ).toEqual(['guest-4']);
  });
});
