import { describe, expect, it } from 'vitest';

import {
  OG_IMAGE_SIZE,
  buildInvitationOgFields,
  honoreeFontSize,
  loadOgFonts,
} from '@/lib/server/ogImage';
import type { PublicEvent } from '@/repositories/eventRepository';

/**
 * The share card's content and typefaces (§12).
 *
 * The fonts are asserted against the real files on disk rather than a mock, because
 * the failure this guards is a missing or unreadable file — a mock of `readFile`
 * would pass happily with `assets/fonts/` deleted, which is the exact deploy that
 * renders every invitation preview as a blank rectangle.
 */

/** A fully-populated event; each case below removes only the field it is about. */
function anEvent(overrides: Partial<PublicEvent> = {}): PublicEvent {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    public_id: 'AbCdEfGhIjKl',
    event_type: 'wedding',
    title: null,
    hosts_names: 'משפחות א׳ וב׳',
    honoree_display_name: 'דנה ויונתן',
    event_date: '2026-08-12',
    ceremony_time: '19:30:00',
    reception_time: '18:30:00',
    venue_name: 'אולמי הגן',
    address: null,
    waze_url: null,
    google_maps_url: null,
    gift_url: null,
    contact_phone: null,
    description: null,
    side_a_label: null,
    side_b_label: null,
    ...overrides,
  };
}

describe('loadOgFonts', () => {
  it('loads the three faces the card draws with', async () => {
    const fonts = await loadOgFonts();

    expect(fonts.map((font) => `${font.name} ${font.weight}`)).toEqual([
      'Assistant 400',
      'Assistant 700',
      'Frank Ruhl Libre 700',
    ]);
  });

  /**
   * Satori cannot read a variable font's `fvar` table and throws parsing one, so these
   * must stay static TTF instances. `00 01 00 00` is the TrueType magic; a WOFF2 or an
   * EOT — both of which Google Fonts will happily serve depending on the user agent
   * that asked — starts with something else and fails at render time, not here.
   */
  it('ships real TrueType files, not a web-font wrapper', async () => {
    const fonts = await loadOgFonts();

    for (const font of fonts) {
      expect([...font.data.subarray(0, 4)]).toEqual([0x00, 0x01, 0x00, 0x00]);
    }
  });

  it('reads from disk once and hands back the same array afterwards', async () => {
    expect(await loadOgFonts()).toBe(await loadOgFonts());
  });
});

describe('OG_IMAGE_SIZE', () => {
  /** WhatsApp, Facebook and iMessage all crop toward 1.91:1; anything else gets cut. */
  it('is the 1.91:1 card every preview client expects', () => {
    expect(OG_IMAGE_SIZE).toEqual({ width: 1200, height: 630 });
  });
});

describe('honoreeFontSize', () => {
  it.each([
    ['דנה ויונתן', 92],
    ['אברהם יצחק ושרה', 72],
    ['משפחת כהן־אברמוביץ׳ ומשפחת לוי', 54],
    ['משפחות כהן־אברמוביץ׳ ולוי־בן־שמעון מירושלים', 42],
  ])('sets %s at %ipx', (honoree, expected) => {
    expect(honoreeFontSize(honoree)).toBe(expected);
  });

  /** The steps are inclusive at the top of each band, which is easy to get wrong by one. */
  it('treats the band boundaries as inclusive', () => {
    expect(honoreeFontSize('א'.repeat(14))).toBe(92);
    expect(honoreeFontSize('א'.repeat(15))).toBe(72);
    expect(honoreeFontSize('א'.repeat(24))).toBe(72);
    expect(honoreeFontSize('א'.repeat(25))).toBe(54);
    expect(honoreeFontSize('א'.repeat(36))).toBe(54);
    expect(honoreeFontSize('א'.repeat(37))).toBe(42);
  });
});

describe('buildInvitationOgFields', () => {
  it('names the occasion, the couple, the date and the venue', () => {
    expect(buildInvitationOgFields(anEvent())).toEqual({
      blessing: 'בשבח והודיה לה׳ יתברך',
      invitation: 'שמחים להזמינכם לחתונה של',
      honoree: 'דנה ויונתן',
      honoreeSize: 92,
      weekday: 'יום רביעי',
      date: '12.8.2026',
      time: '19:30',
      venue: 'אולמי הגן',
    });
  });

  /** Matches the invitation card, which leads with the ceremony. */
  it('prefers the ceremony time over the reception time', () => {
    const fields = buildInvitationOgFields(anEvent({ ceremony_time: '20:00:00' }));
    expect(fields.time).toBe('20:00');
  });

  it('falls back to the reception time when there is no ceremony time', () => {
    const fields = buildInvitationOgFields(anEvent({ ceremony_time: null }));
    expect(fields.time).toBe('18:30');
  });

  it('omits the time entirely when the event has neither', () => {
    const fields = buildInvitationOgFields(anEvent({ ceremony_time: null, reception_time: null }));
    expect(fields.time).toBe('');
  });

  /**
   * Every column in `public_event_v2` is nullable and a `time` is a string by the time
   * it reaches here, so a malformed one is reachable from a hand-written fixture or a
   * future column change. A share card is the last place that should print `null:00`.
   */
  it('omits a time it cannot parse rather than printing it', () => {
    const fields = buildInvitationOgFields(anEvent({ ceremony_time: 'not-a-time' }));
    expect(fields.time).toBe('');
  });

  it('drops the whole date row when the date is unusable, rather than printing an em dash', () => {
    const fields = buildInvitationOgFields(anEvent({ event_date: null }));
    expect(fields.weekday).toBe('');
    expect(fields.date).toBe('');
  });

  it('sets the hosts large when there is no honoree', () => {
    const fields = buildInvitationOgFields(anEvent({ honoree_display_name: null }));
    expect(fields.honoree).toBe('משפחות א׳ וב׳');
  });

  it('falls through to the event-type label when neither name is stored', () => {
    const fields = buildInvitationOgFields(
      anEvent({ honoree_display_name: null, hosts_names: null }),
    );
    expect(fields.honoree).toBe('חתונה');
  });

  /** A stored empty string is not null, so `??` alone would leave a hole on the card. */
  it('falls through to the event-type label when the name is blank rather than absent', () => {
    const fields = buildInvitationOgFields(anEvent({ honoree_display_name: '' }));
    expect(fields.honoree).toBe('חתונה');
    expect(fields.honoreeSize).toBe(92);
  });

  it('omits the venue line when the venue is unnamed', () => {
    expect(buildInvitationOgFields(anEvent({ venue_name: null })).venue).toBe('');
  });

  /** A row written by a newer version must still render, in the neutral wording. */
  it('renders an unknown event type with the neutral preset', () => {
    const fields = buildInvitationOgFields(
      anEvent({ event_type: 'seance' as PublicEvent['event_type'] }),
    );
    expect(fields.invitation).toBe('שמחים להזמינכם לאירוע של');
  });

  it('scales the headline down for a long name', () => {
    const fields = buildInvitationOgFields(
      anEvent({ honoree_display_name: 'משפחות כהן־אברמוביץ׳ ולוי־בן־שמעון מירושלים' }),
    );
    expect(fields.honoreeSize).toBe(42);
  });
});
