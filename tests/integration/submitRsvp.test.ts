import { randomUUID } from 'node:crypto';

import type { PoolClient } from 'pg';
import { describe, expect, it } from 'vitest';

import { withRollback } from '../setup/database.setup';

/**
 * `submit_rsvp` as a transaction (§6.3, §6.4, §10.4).
 *
 * The Server Action is a thin orchestrator; the decisions that matter — create versus
 * update, idempotent replay, and the refusal to tell an anonymous submitter whether a
 * phone number is already on the list — all happen inside this one routine, where they
 * are atomic. Testing them through the action would test the action. This tests the
 * guarantee.
 *
 * Every test runs inside `withRollback`, so nothing it writes ever commits. That is
 * what makes the suite safe against any database, including the one serving the live
 * site, and it is why no second Supabase project is needed.
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

async function seedEvent(client: PoolClient): Promise<string> {
  const ownerId = randomUUID();
  await client.query(
    `insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                             email_confirmed_at, created_at, updated_at)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
             $2, '', now(), now(), now())`,
    [ownerId, `submit-${randomUUID()}@example.test`],
  );
  const { rows } = await client.query<{ id: string }>(
    `insert into public.events
       (owner_user_id, public_id, title, event_type, hosts_names, honoree_display_name,
        event_date, venue_name, address, is_active)
     values ($1, $2, 'אירוע', 'other', 'מארחים', 'חוגג', current_date + 30, 'אולם', 'כתובת', true)
     returning id`,
    [ownerId, randomUUID().replaceAll('-', '').slice(0, 12)],
  );
  return rows[0]!.id;
}

/** Calls the routine the way the privileged server client does. */
async function submit(client: PoolClient, args: SubmitArgs): Promise<Record<string, unknown>> {
  const { rows } = await client.query<{ submit_rsvp: Record<string, unknown> }>(
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

async function countRsvps(client: PoolClient, eventId: string): Promise<number> {
  const { rows } = await client.query<{ count: string }>(
    'select count(*) from public.rsvps where event_id = $1',
    [eventId],
  );
  return Number(rows[0]!.count);
}

describe('submit_rsvp', () => {
  it('creates a reply', async () => {
    await withRollback(async (client) => {
      const eventId = await seedEvent(client);
      const result = await submit(client, { eventId });
      expect(result['outcome']).toBe('accepted');
      expect(await countRsvps(client, eventId)).toBe(1);
    });
  });

  /**
   * §6.3. A double-tapped submit button sends the identical body twice, and that is
   * the case this has to collapse — not reject. The second call must be acknowledged
   * and must not produce a second row.
   */
  it('collapses an identical resubmission into one row', async () => {
    await withRollback(async (client) => {
      const eventId = await seedEvent(client);
      const idempotencyKeyHash = randomUUID();
      const fingerprint = randomUUID();

      const first = await submit(client, { eventId, idempotencyKeyHash, fingerprint });
      const second = await submit(client, { eventId, idempotencyKeyHash, fingerprint });

      expect(first['outcome']).toBe('accepted');
      expect(second['outcome']).toBe('accepted');
      expect(await countRsvps(client, eventId)).toBe(1);
    });
  });

  /**
   * §6.4, and the most important assertion in this file.
   *
   * Knowing a phone number must not be enough to overwrite somebody else's reply. The
   * UNIQUE constraint on (event_id, phone_normalized) stops a duplicate row; it is not
   * authorisation. So an unauthorised resubmission for a number already on the list has
   * to leave that row exactly as it was — while still answering 'accepted', because any
   * other answer would confirm to a stranger that the number is on the list.
   *
   * The first version of this test asserted the opposite: that the counts were
   * overwritten. It failed, and it was the test that was wrong — it demanded the
   * vulnerability this routine exists to prevent.
   */
  it('acknowledges an unauthorised resubmission without changing the row', async () => {
    await withRollback(async (client) => {
      const eventId = await seedEvent(client);
      await submit(client, { eventId, adults: 2, children: 0 });

      const second = await submit(client, { eventId, adults: 5, children: 2 });

      // Indistinguishable from a first submission, on purpose.
      expect(second['outcome']).toBe('accepted');
      expect(await countRsvps(client, eventId)).toBe(1);

      const { rows } = await client.query<{ adults_count: number; children_count: number }>(
        'select adults_count, children_count from public.rsvps where event_id = $1',
        [eventId],
      );
      // Untouched: the numbers are still the ones the original guest submitted.
      expect(rows[0]).toMatchObject({ adults_count: 2, children_count: 0 });
    });
  });

  /** The same write, authorised — a live update token scoped to that one reply. */
  it('does update when the caller holds the row’s update token', async () => {
    await withRollback(async (client) => {
      const eventId = await seedEvent(client);
      const token = randomUUID();

      await client.query(
        `insert into public.rsvps
           (event_id, full_name, phone, phone_normalized, attendance_status, adults_count,
            consent, source, update_token_hash, update_token_expires_at)
         values ($1, 'אורח בדיקה', $2, $2, 'attending', 2, true, 'public_form', $3, now() + interval '30 days')`,
        [eventId, PHONE, token],
      );

      const { rows: result } = await client.query<{ submit_rsvp: Record<string, unknown> }>(
        `select public.submit_rsvp(
           $1, null, 'אורח בדיקה', $2, $2, null, 'attending'::public.attendance_status,
           5, 2, 0, null, null, true, 'public_form'::public.rsvp_source,
           $3, $4, $5, null, 60, 24
         ) as submit_rsvp`,
        [eventId, PHONE, randomUUID(), randomUUID(), token],
      );
      /*
       * 'updated', where the unauthorised path answers 'accepted'. That asymmetry is
       * the §6.4 rule in one word: only a caller who proved it owns the row is told
       * that a row existed. Anyone else gets the same answer whether they created
       * something or changed nothing, and cannot tell the difference.
       */
      expect(result[0]!.submit_rsvp['outcome']).toBe('updated');

      const { rows } = await client.query<{ adults_count: number; children_count: number }>(
        'select adults_count, children_count from public.rsvps where event_id = $1',
        [eventId],
      );
      expect(rows[0]).toMatchObject({ adults_count: 5, children_count: 2 });
    });
  });

  it('keeps two different phone numbers as two replies', async () => {
    await withRollback(async (client) => {
      const eventId = await seedEvent(client);
      await submit(client, { eventId, phone: '+972501111111' });
      await submit(client, { eventId, phone: '+972502222222' });
      expect(await countRsvps(client, eventId)).toBe(2);
    });
  });

  it('refuses a reply to an event that is not published', async () => {
    await withRollback(async (client) => {
      const eventId = await seedEvent(client);
      await client.query('update public.events set is_active = false where id = $1', [eventId]);

      const result = await submit(client, { eventId });
      expect(result['outcome']).toBe('event_unavailable');
      expect(await countRsvps(client, eventId)).toBe(0);
    });
  });

  it('refuses a reply to an event that does not exist', async () => {
    await withRollback(async (client) => {
      const result = await submit(client, { eventId: randomUUID() });
      expect(result['outcome']).toBe('event_unavailable');
    });
  });

  /** Mirrors `rsvps_not_attending_has_no_seats`, which the form also enforces. */
  it('rejects seats on a decline rather than storing them', async () => {
    await withRollback(async (client) => {
      const eventId = await seedEvent(client);
      await expect(submit(client, { eventId, status: 'not_attending', adults: 3 })).rejects.toThrow(
        /rsvps_not_attending_has_no_seats|check constraint/i,
      );
    });
  });

  it('accepts a decline with no seats', async () => {
    await withRollback(async (client) => {
      const eventId = await seedEvent(client);
      const result = await submit(client, { eventId, status: 'not_attending', adults: 0 });
      expect(result['outcome']).toBe('accepted');
    });
  });
});
