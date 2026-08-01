import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_EVENT_BRANDING } from '@/lib/premiumEventTools';

/**
 * The public read path (§4.6).
 *
 * This module is the entire surface by which an anonymous visitor reaches event data,
 * and it had no test. The behaviours below are security properties rather than
 * conveniences: malformed ids never reach the database, and unpublished records are
 * indistinguishable from missing ones.
 */

const rpc = vi.fn();

vi.mock('@/lib/server/supabase', () => ({
  createAnonymousClient: () => ({ rpc }),
}));

const { getEventBrandingByPublicId, getEventByPublicId } =
  await import('@/repositories/eventRepository');

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
        expect(rpc).not.toHaveBeenCalled();
      });
    }
  });

  it('treats an all-null composite as not found', async () => {
    rpc.mockResolvedValue({ data: { ...event, id: null }, error: null });
    await expect(getEventByPublicId('abcdefghij12')).resolves.toBeNull();
  });

  it('treats a null payload as not found', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(getEventByPublicId('abcdefghij12')).resolves.toBeNull();
  });

  it('throws without repeating the driver’s message', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'connection to db.secret-ref.supabase.co failed' },
    });

    await expect(getEventByPublicId('abcdefghij12')).rejects.toThrow('PGRST202');
    await expect(getEventByPublicId('abcdefghij12')).rejects.not.toThrow(/secret-ref/);
  });
});

describe('getEventBrandingByPublicId', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('rejects malformed ids without a database call', async () => {
    await expect(getEventBrandingByPublicId('bad')).resolves.toEqual(DEFAULT_EVENT_BRANDING);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('returns the safe branding shape from the public RPC', async () => {
    rpc.mockResolvedValue({
      data: {
        primary_color: '#112233',
        accent_color: '#AABBCC',
        logo_url: 'https://example.com/logo.png',
        invitation_style: 'modern',
      },
      error: null,
    });

    await expect(getEventBrandingByPublicId('abcdefghij12')).resolves.toEqual({
      primaryColor: '#112233',
      accentColor: '#AABBCC',
      logoUrl: 'https://example.com/logo.png',
      invitationStyle: 'modern',
    });
    expect(rpc).toHaveBeenCalledWith('get_public_event_branding', {
      p_public_id: 'abcdefghij12',
    });
  });

  it('uses defaults when the RPC returns no branding', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(getEventBrandingByPublicId('abcdefghij12')).resolves.toEqual(
      DEFAULT_EVENT_BRANDING,
    );
  });

  it('keeps invitations available while the branding migration is rolling out', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'function does not exist yet' },
    });
    await expect(getEventBrandingByPublicId('abcdefghij12')).resolves.toEqual(
      DEFAULT_EVENT_BRANDING,
    );
  });
});
