import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The public read path (§4.6).
 *
 * This module is the entire surface by which an anonymous visitor reaches event data,
 * and it had no test. The two behaviours below are both security properties rather
 * than conveniences:
 *
 *   - the shape check rejects a malformed id before a database round trip, so the
 *     endpoint cannot be used as a free query generator;
 *   - a missing event and an unpublished one both return null, because the caller
 *     renders the same 404 for either and distinguishing them would make the id space
 *     enumerable one probe at a time.
 */

const rpc = vi.fn();

vi.mock('@/lib/server/supabase', () => ({
  createAnonymousClient: () => ({ rpc }),
}));

const { getEventByPublicId } = await import('@/repositories/eventRepository');

const event = {
  id: '11111111-1111-1111-1111-111111111111',
  public_id: 'abcdefghij12',
  event_type: 'wedding',
  title: 'החתונה של דנה ויונתן',
  hosts_names: 'משפחות כהן ולוי',
  honoree_display_name: 'דנה ויונתן',
  event_date: '2026-09-04',
  ceremony_time: '19:00:00',
  reception_time: '18:00:00',
  venue_name: 'אולמי הדר',
  address: 'הרצל 12, פתח תקווה',
  waze_url: null,
  google_maps_url: null,
  contact_phone: null,
  description: null,
  side_a_label: null,
  side_b_label: null,
};

describe('getEventByPublicId', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('returns the event for a well-formed id', async () => {
    rpc.mockResolvedValue({ data: event, error: null });

    await expect(getEventByPublicId('abcdefghij12')).resolves.toEqual(event);
    expect(rpc).toHaveBeenCalledWith('get_public_event_by_public_id', {
      p_public_id: 'abcdefghij12',
    });
  });

  describe('rejects a malformed id without touching the database', () => {
    const malformed = [
      ['too short', 'abc'],
      ['too long', 'a'.repeat(33)],
      ['empty', ''],
      ['a SQL fragment', "abcdefghij' or 1=1--"],
      ['a path traversal attempt', '../../etc/passwd'],
      ['characters outside base64url', 'abcdefghij!@'],
      ['a percent-encoded payload', 'abcdefghij%20'],
    ] as const;

    for (const [label, id] of malformed) {
      it(label, async () => {
        await expect(getEventByPublicId(id)).resolves.toBeNull();
        // The point of the guard: no round trip at all.
        expect(rpc).not.toHaveBeenCalled();
      });
    }
  });

  /**
   * The composite type comes back with every field null when nothing matched, rather
   * than as SQL NULL — so a bare null check on `data` would return an object full of
   * nulls and the invitation page would render an empty card instead of a 404.
   */
  it('treats an all-null composite as not found', async () => {
    rpc.mockResolvedValue({ data: { ...event, id: null }, error: null });
    await expect(getEventByPublicId('abcdefghij12')).resolves.toBeNull();
  });

  it('treats a null payload as not found', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(getEventByPublicId('abcdefghij12')).resolves.toBeNull();
  });

  /**
   * §13: the Supabase error carries connection detail. The thrown message names the
   * code and nothing else, so a stack trace reaching a log cannot leak the host or
   * the credentials along with it.
   */
  it('throws without repeating the driver’s message', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'connection to db.secret-ref.supabase.co failed' },
    });

    await expect(getEventByPublicId('abcdefghij12')).rejects.toThrow('PGRST202');
    await expect(getEventByPublicId('abcdefghij12')).rejects.not.toThrow(/secret-ref/);
  });
});
