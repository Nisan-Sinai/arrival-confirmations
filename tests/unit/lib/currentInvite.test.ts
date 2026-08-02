import { beforeEach, describe, expect, it, vi } from 'vitest';

interface DbError {
  readonly code: string;
}

interface SessionRow {
  readonly id: string;
  readonly event_id: string;
  readonly guest_id: string;
  readonly expires_at: string;
  readonly revoked_at: string | null;
}

interface GuestRow {
  readonly id: string;
  readonly event_id: string;
  readonly full_name: string;
  readonly phone: string;
  readonly phone_normalized: string;
  readonly party_size: number;
  readonly family_side: 'side_a' | 'side_b' | 'other' | null;
  readonly is_active: boolean;
}

interface EventRow {
  readonly id: string;
  readonly public_id: string;
  readonly title: string;
  readonly event_type: string;
  readonly hosts_names: string;
  readonly honoree_display_name: string;
  readonly event_date: string;
  readonly ceremony_time: string | null;
  readonly reception_time: string | null;
  readonly venue_name: string;
  readonly address: string;
  readonly waze_url: string | null;
  readonly google_maps_url: string | null;
  readonly contact_phone: string | null;
  readonly description: string | null;
  readonly side_a_label: string | null;
  readonly side_b_label: string | null;
  readonly is_active: boolean;
}

interface QueryResult<T> {
  data: T | null;
  error: DbError | null;
}

interface ValidationInput {
  readonly guestId: string;
  readonly eventId: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

type ValidationResult =
  | { readonly valid: true; readonly guestId: string; readonly eventId: string }
  | { readonly valid: false; readonly rejection: string };

const state = vi.hoisted(() => ({
  cookieValue: undefined as string | undefined,
  wellFormed: false,
  hash: 'session-hash',
  hashInput: null as string | null,
  validation: { valid: false, rejection: 'not_found' } as ValidationResult,
  validationInput: null as ValidationInput | null,
  session: { data: null, error: null } as QueryResult<SessionRow>,
  guest: { data: null, error: null } as QueryResult<GuestRow>,
  event: { data: null, error: null } as QueryResult<EventRow>,
  fromTables: [] as string[],
}));

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (_name: string) =>
      state.cookieValue === undefined ? undefined : { value: state.cookieValue },
  }),
}));

vi.mock('@/lib/server/inviteSession', () => ({
  INVITE_SESSION_COOKIE: 'invite-session',
  isWellFormedRawToken: () => state.wellFormed,
  hashSessionToken: (raw: string) => {
    state.hashInput = raw;
    return state.hash;
  },
  validateInviteSession: (input: ValidationInput) => {
    state.validationInput = input;
    return state.validation;
  },
}));

vi.mock('@/lib/server/supabase', () => {
  const queryFor = (result: QueryResult<unknown>) => {
    const query = {
      select: (_columns: string) => query,
      eq: (_column: string, _value: unknown) => query,
      maybeSingle: async () => result,
    };
    return query;
  };

  return {
    createPrivilegedClient: () => ({
      from: (table: string) => {
        state.fromTables.push(table);
        if (table === 'invite_sessions') return queryFor(state.session);
        if (table === 'guests') return queryFor(state.guest);
        if (table === 'events') return queryFor(state.event);
        throw new Error(`Unexpected table: ${table}`);
      },
    }),
  };
});

const { getActiveInviteContext } = await import('@/lib/server/currentInvite');

const sessionRow = (overrides: Partial<SessionRow> = {}): SessionRow => ({
  id: 'session-1',
  event_id: 'event-1',
  guest_id: 'guest-1',
  expires_at: '2099-08-02T20:00:00.000Z',
  revoked_at: null,
  ...overrides,
});

const guestRow = (overrides: Partial<GuestRow> = {}): GuestRow => ({
  id: 'guest-1',
  event_id: 'event-1',
  full_name: 'ישראל ישראלי',
  phone: '050-1234567',
  phone_normalized: '972501234567',
  party_size: 3,
  family_side: 'side_a',
  is_active: true,
  ...overrides,
});

const eventRow = (overrides: Partial<EventRow> = {}): EventRow => ({
  id: 'event-1',
  public_id: 'public-event',
  title: 'אירוע משפחתי',
  event_type: 'brit_mila',
  hosts_names: 'משפחת ישראלי',
  honoree_display_name: 'דוד',
  event_date: '2099-08-10',
  ceremony_time: '10:00',
  reception_time: '09:30',
  venue_name: 'אולם השמחה',
  address: 'רחוב הראשונים 1, נתניה',
  waze_url: 'https://waze.example/event',
  google_maps_url: 'https://maps.example/event',
  contact_phone: '050-7654321',
  description: 'נשמח לראותכם',
  side_a_label: 'צד א',
  side_b_label: 'צד ב',
  is_active: true,
  ...overrides,
});

function configureLiveSession(session: SessionRow = sessionRow()): void {
  state.cookieValue = 'a'.repeat(43);
  state.wellFormed = true;
  state.session = { data: session, error: null };
  state.validation = { valid: true, guestId: session.guest_id, eventId: session.event_id };
}

describe('getActiveInviteContext', () => {
  beforeEach(() => {
    state.cookieValue = undefined;
    state.wellFormed = false;
    state.hash = 'session-hash';
    state.hashInput = null;
    state.validation = { valid: false, rejection: 'not_found' };
    state.validationInput = null;
    state.session = { data: null, error: null };
    state.guest = { data: null, error: null };
    state.event = { data: null, error: null };
    state.fromTables.length = 0;
  });

  it('returns null before touching the database when the cookie is missing or malformed', async () => {
    expect(await getActiveInviteContext()).toBeNull();
    expect(state.fromTables).toEqual([]);
    expect(state.hashInput).toBeNull();
  });

  it('returns null when the invite-session lookup fails', async () => {
    state.cookieValue = 'a'.repeat(43);
    state.wellFormed = true;
    state.session = { data: null, error: { code: 'lookup_failed' } };

    expect(await getActiveInviteContext()).toBeNull();
    expect(state.hashInput).toBe(state.cookieValue);
  });

  it('returns null when the session does not exist', async () => {
    state.cookieValue = 'a'.repeat(43);
    state.wellFormed = true;

    expect(await getActiveInviteContext()).toBeNull();
  });

  it('returns null when session validation rejects it and converts a revocation timestamp', async () => {
    configureLiveSession(sessionRow({ revoked_at: '2099-08-02T19:00:00.000Z' }));
    state.validation = { valid: false, rejection: 'revoked' };

    expect(await getActiveInviteContext()).toBeNull();
    expect(state.validationInput).toEqual({
      guestId: 'guest-1',
      eventId: 'event-1',
      expiresAt: new Date('2099-08-02T20:00:00.000Z'),
      revokedAt: new Date('2099-08-02T19:00:00.000Z'),
    });
  });

  it('returns null when the guest lookup fails', async () => {
    configureLiveSession();
    state.guest = { data: null, error: { code: 'guest_failed' } };
    state.event = { data: eventRow(), error: null };

    expect(await getActiveInviteContext()).toBeNull();
  });

  it('returns null when the event lookup fails', async () => {
    configureLiveSession();
    state.guest = { data: guestRow(), error: null };
    state.event = { data: null, error: { code: 'event_failed' } };

    expect(await getActiveInviteContext()).toBeNull();
  });

  it('returns null when the guest record is missing', async () => {
    configureLiveSession();
    state.guest = { data: null, error: null };
    state.event = { data: eventRow(), error: null };

    expect(await getActiveInviteContext()).toBeNull();
  });

  it('returns null when the event record is missing', async () => {
    configureLiveSession();
    state.guest = { data: guestRow(), error: null };
    state.event = { data: null, error: null };

    expect(await getActiveInviteContext()).toBeNull();
  });

  it('returns null when the guest is inactive', async () => {
    configureLiveSession();
    state.guest = { data: guestRow({ is_active: false }), error: null };
    state.event = { data: eventRow(), error: null };

    expect(await getActiveInviteContext()).toBeNull();
  });

  it('returns null when the event is inactive', async () => {
    configureLiveSession();
    state.guest = { data: guestRow(), error: null };
    state.event = { data: eventRow({ is_active: false }), error: null };

    expect(await getActiveInviteContext()).toBeNull();
  });

  it('returns the complete active invitation context', async () => {
    configureLiveSession();
    state.guest = { data: guestRow(), error: null };
    state.event = { data: eventRow(), error: null };

    await expect(getActiveInviteContext()).resolves.toEqual({
      sessionId: 'session-1',
      event: {
        id: 'event-1',
        publicId: 'public-event',
        title: 'אירוע משפחתי',
        eventType: 'brit_mila',
        hostsNames: 'משפחת ישראלי',
        honoreeDisplayName: 'דוד',
        eventDate: '2099-08-10',
        ceremonyTime: '10:00',
        receptionTime: '09:30',
        venueName: 'אולם השמחה',
        address: 'רחוב הראשונים 1, נתניה',
        wazeUrl: 'https://waze.example/event',
        googleMapsUrl: 'https://maps.example/event',
        contactPhone: '050-7654321',
        description: 'נשמח לראותכם',
        sideALabel: 'צד א',
        sideBLabel: 'צד ב',
      },
      guest: {
        id: 'guest-1',
        fullName: 'ישראל ישראלי',
        phone: '050-1234567',
        phoneNormalized: '972501234567',
        partySize: 3,
        familySide: 'side_a',
      },
    });
    expect(state.validationInput?.revokedAt).toBeNull();
    expect(state.fromTables).toEqual(['invite_sessions', 'guests', 'events']);
  });
});
