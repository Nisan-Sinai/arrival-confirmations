import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import { getTestPool } from '../setup/database.setup';

/**
 * `submit_rsvp` as a transaction (§6.3, §6.4, §10.4).
 *
 * The Server Action is a thin orchestrator; the decisions that matter — create versus
 * update, idempotent replay, and the refusal to leak whether a phone number is already
 * on the list — all happen inside this one routine, where they are atomic. Testing them
 * through the action would test the action. This tests the guarantee.
 *
 * REQUIRES A DEDICATED TEST PROJECT. The shared setup truncates every table before each
 * test; `tests/setup/testDatabaseUrl.ts` refuses to run when TEST_DATABASE_URL names the
 * same Supabase project as the application.
 */

const PHONE = '+972501234567';

interface SubmitArgs {
  readonly eventId: string;
  readonly phone?: string;
  readonly status?: 'attending' | 'not_attending' | 'maybe';
  readonly adults?: number;
  readonly children?: number;
  readonly babies?: number;
  readonly idempotencyKeyHash?: string;
  readonly fingerprint?: string;
}

async function seedEvent(): Promise<string> {
  const pool = getTestPool();
  const ownerId = randomUUID();
  await pool.query(
    `insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                             email_confirmed_at, created_at, updated_at)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
             $2, '', now(), now(), now())`,
    [ownerId, `submit-${Date.now()}@example.test`],
  );
  const { rows } = await pool.query<{ id: string }>(
    `insert into public.events
       (owner_user_id, public_id, title, event_type, hosts_names, honoree_display_name,
        event_date, venue_name, address, is_active)
     values ($1, $2, 'אירוע', 'other', 'מארחים', 'חוגג', current_date + 30, 'אולם', 'כתובת', true)
     returning id`,
    [ownerId, `sub${Date.now()}`.slice(0, 12)],
  );
  return rows[0]!.id;
}

/** Calls the routine the way the privileged server client does. */
async function submit(args: SubmitArgs): Promise<Record<string, unknown>> {
  const { rows } = await getTestPool().query<{ submit_rsvp: Record<string, unknown> }>(
    `select public.submit_rsvp(
       $1, null, 'אורח בדיקה', $2, $2, null, $3::public.attendance_status,
       $4, $5, $6, null, null, true, 'public_form'::public.rsvp_source,
       $7, $8, null, null, 60, 24
     ) as submit_rsvp`,
    [
      args.eventId,
      args.phone ?? PHONE,
      args.status ?? 'attending',
      args.adults ?? 2,
      args.children ?? 0,
      args.babies ?? 0,
      args.idempotencyKeyHash ?? randomUUID(),
      args.fingerprint ?? randomUUID(),
    ],
  );
  return rows[0]!.submit_rsvp;
}

const countRsvps = async (eventId: string): Promise<number> => {
  const { rows } = await getTestPool().query<{ count: string }>(
    'select count(*) from public.rsvps where event_id = $1',
    [eventId],
  );
  return Number(rows[0]!.count);
};

describe('submit_rsvp', () => {
  let eventId: string;

  beforeEach(async () => {
    eventId = await seedEvent();
  });

  it('creates a reply', async () => {
    const result = await submit({ eventId });
    expect(result['outcome']).toBe('accepted');
    expect(await countRsvps(eventId)).toBe(1);
  });

  /**
   * §6.3. A double-tapped submit button sends the identical body twice, and that is
   * the case this has to collapse — not reject. The second call must be acknowledged
   * and must not produce a second row.
   */
  it('collapses an identical resubmission into one row', async () => {
    const key = randomUUID();
    const fingerprint = randomUUID();

    const first = await submit({ eventId, idempotencyKeyHash: key, fingerprint });
    const second = await submit({ eventId, idempotencyKeyHash: key, fingerprint });

    expect(first['outcome']).toBe('accepted');
    expect(second['outcome']).toBe('accepted');
    expect(await countRsvps(eventId)).toBe(1);
  });

  /**
   * §6.4. The same phone with a *different* answer is a genuine change of mind, not a
   * replay. It updates rather than inserting, and the caller is told the same thing
   * either way — an anonymous submitter must not learn that the number was already on
   * the list.
   */
  it('updates in place when the same phone answers differently', async () => {
    await submit({ eventId, adults: 2 });
    const changed = await submit({ eventId, adults: 5, children: 2 });

    expect(changed['outcome']).toBe('accepted');
    expect(await countRsvps(eventId)).toBe(1);

    const { rows } = await getTestPool().query<{ adults_count: number; children_count: number }>(
      'select adults_count, children_count from public.rsvps where event_id = $1',
      [eventId],
    );
    expect(rows[0]).toMatchObject({ adults_count: 5, children_count: 2 });
  });

  it('keeps two different phone numbers as two replies', async () => {
    await submit({ eventId, phone: '+972501111111' });
    await submit({ eventId, phone: '+972502222222' });
    expect(await countRsvps(eventId)).toBe(2);
  });

  it('refuses a reply to an event that is not published', async () => {
    await getTestPool().query('update public.events set is_active = false where id = $1', [
      eventId,
    ]);
    const result = await submit({ eventId });
    expect(result['outcome']).toBe('event_unavailable');
    expect(await countRsvps(eventId)).toBe(0);
  });

  it('refuses a reply to an event that does not exist', async () => {
    const result = await submit({ eventId: randomUUID() });
    expect(result['outcome']).toBe('event_unavailable');
  });

  /** Mirrors `rsvps_not_attending_has_no_seats`, which the form also enforces. */
  it('rejects seats on a decline rather than storing them', async () => {
    await expect(submit({ eventId, status: 'not_attending', adults: 3 })).rejects.toThrow(
      /rsvps_not_attending_has_no_seats|check constraint/i,
    );
    expect(await countRsvps(eventId)).toBe(0);
  });

  it('accepts a decline with no seats', async () => {
    const result = await submit({ eventId, status: 'not_attending', adults: 0 });
    expect(result['outcome']).toBe('accepted');
  });
});
