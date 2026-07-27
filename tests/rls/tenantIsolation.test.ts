import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import { getTestPool } from '../setup/database.setup';

/**
 * Tenant isolation, asserted against the policies rather than against the code (§4.1,
 * §10.6).
 *
 * Every route in the application already checks the caller, and every one of those
 * checks is a convenience. The guarantee is here: with `authenticated` set to host A,
 * host B's event has to be invisible even to a query that asks for it by id. That is
 * what makes a bug in a Server Component a bug rather than a breach.
 *
 * These run as the real Postgres roles — `set local role authenticated` plus a JWT
 * claim — not through the Supabase client, so nothing in between can accidentally add
 * the filter that is supposed to be the policy's job.
 *
 * REQUIRES A DEDICATED TEST PROJECT. The shared setup truncates every table before
 * each test; `tests/setup/testDatabaseUrl.ts` refuses to run when TEST_DATABASE_URL
 * names the same Supabase project as the application.
 */

interface Tenant {
  readonly userId: string;
  readonly eventId: string;
  readonly publicId: string;
}

/** Runs a statement as a signed-in user, exactly as PostgREST would. */
async function asUser<T>(userId: string, sql: string, params: unknown[] = []): Promise<T[]> {
  const client = await getTestPool().connect();
  try {
    await client.query('begin');
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ]);
    await client.query('set local role authenticated');
    const { rows } = await client.query(sql, params);
    return rows as T[];
  } finally {
    await client.query('rollback').catch(() => undefined);
    client.release();
  }
}

async function asAnon<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = await getTestPool().connect();
  try {
    await client.query('begin');
    await client.query('set local role anon');
    const { rows } = await client.query(sql, params);
    return rows as T[];
  } finally {
    await client.query('rollback').catch(() => undefined);
    client.release();
  }
}

/** Creates an owner and one published event, with the service role. */
async function seedTenant(label: string): Promise<Tenant> {
  const pool = getTestPool();
  const userId = randomUUID();
  const publicId = `rls${label}${Date.now()}`.slice(0, 12);

  // auth.users is outside the app schema, so the row is inserted directly rather than
  // through the admin API — the suite needs a uuid the policies will accept, nothing more.
  await pool.query(
    `insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                             email_confirmed_at, created_at, updated_at)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
             $2, '', now(), now(), now())
     on conflict (id) do nothing`,
    [userId, `rls-${label}-${Date.now()}@example.test`],
  );

  const { rows } = await pool.query<{ id: string }>(
    `insert into public.events
       (owner_user_id, public_id, title, event_type, hosts_names, honoree_display_name,
        event_date, venue_name, address, is_active)
     values ($1, $2, $3, 'other', 'מארחים', 'חוגג', current_date + 30, 'אולם', 'כתובת', true)
     returning id`,
    [userId, publicId, `אירוע ${label}`],
  );

  return { userId, eventId: rows[0]!.id, publicId };
}

describe('tenant isolation', () => {
  let alice: Tenant;
  let bob: Tenant;

  beforeEach(async () => {
    alice = await seedTenant('a');
    bob = await seedTenant('b');
  });

  it('lets a host read their own event', async () => {
    const rows = await asUser<{ id: string }>(alice.userId, 'select id from public.events');
    expect(rows.map((r) => r.id)).toEqual([alice.eventId]);
  });

  /** The whole point. Asking for it by id must still return nothing. */
  it('hides another host’s event even when it is named directly', async () => {
    const rows = await asUser(alice.userId, 'select id from public.events where id = $1', [
      bob.eventId,
    ]);
    expect(rows).toEqual([]);
  });

  it('silently affects no rows when a host updates another host’s event', async () => {
    const rows = await asUser(
      alice.userId,
      `update public.events set title = 'נחטף' where id = $1 returning id`,
      [bob.eventId],
    );
    // No error, no rows — which is exactly why the Server Action has to check the
    // affected count rather than only the error.
    expect(rows).toEqual([]);
  });

  it('refuses to let a host hand their event to somebody else', async () => {
    await expect(
      asUser(alice.userId, `update public.events set owner_user_id = $1 where id = $2`, [
        bob.userId,
        alice.eventId,
      ]),
    ).rejects.toThrow(/row-level security/i);
  });

  it('refuses an insert that names another account as owner', async () => {
    await expect(
      asUser(
        alice.userId,
        `insert into public.events
           (owner_user_id, public_id, title, event_type, hosts_names, honoree_display_name,
            event_date, venue_name, address, is_active)
         values ($1, 'stolenid1234', 'גנוב', 'other', 'x', 'y', current_date + 1, 'z', 'w', true)`,
        [bob.userId],
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('hides another host’s replies', async () => {
    await getTestPool().query(
      `insert into public.rsvps
         (event_id, full_name, phone, phone_normalized, attendance_status, consent, source)
       values ($1, 'אורח של בוב', '+972501112233', '+972501112233', 'attending', true, 'public_form')`,
      [bob.eventId],
    );

    const rows = await asUser(alice.userId, 'select id from public.rsvps');
    expect(rows).toEqual([]);
  });
});

describe('the anonymous surface', () => {
  let host: Tenant;

  beforeEach(async () => {
    host = await seedTenant('anon');
  });

  it('cannot select from events at all', async () => {
    await expect(asAnon('select id from public.events')).rejects.toThrow(/permission denied/i);
  });

  it('cannot select from rsvps or guests', async () => {
    await expect(asAnon('select id from public.rsvps')).rejects.toThrow(/permission denied/i);
    await expect(asAnon('select id from public.guests')).rejects.toThrow(/permission denied/i);
  });

  /** The one thing it may do — and only with the unguessable id. */
  it('may read a published event through the projection', async () => {
    const rows = await asAnon<{ id: string | null }>(
      'select (public.get_public_event_by_public_id($1)).id',
      [host.publicId],
    );
    expect(rows[0]?.id).toBe(host.eventId);
  });

  it('gets nothing for an id that does not exist', async () => {
    const rows = await asAnon<{ id: string | null }>(
      'select (public.get_public_event_by_public_id($1)).id',
      ['doesnotexist'],
    );
    expect(rows[0]?.id).toBeNull();
  });

  /**
   * An unpublished event and a nonexistent one are indistinguishable from outside.
   * Telling them apart would make the id space enumerable one probe at a time (§4.2).
   */
  it('gets nothing for an unpublished event, exactly as for a missing one', async () => {
    await getTestPool().query('update public.events set is_active = false where id = $1', [
      host.eventId,
    ]);
    const rows = await asAnon<{ id: string | null }>(
      'select (public.get_public_event_by_public_id($1)).id',
      [host.publicId],
    );
    expect(rows[0]?.id).toBeNull();
  });

  it('cannot call the privileged routines', async () => {
    for (const call of [
      `select public.consume_rate_limit('k', 1, 60)`,
      `select public.purge_expired_guest_data(30, 365, true)`,
    ]) {
      await expect(asAnon(call)).rejects.toThrow(/permission denied/i);
    }
  });

  /** Retired in 20260726001200 — it returned an arbitrary active event with no id. */
  it('has no unaddressed get_public_event() to fall back on', async () => {
    await expect(asAnon('select public.get_public_event()')).rejects.toThrow(
      /does not exist|permission denied/i,
    );
  });
});
