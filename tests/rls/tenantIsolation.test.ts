import { randomUUID } from 'node:crypto';

import type { PoolClient } from 'pg';
import { describe, expect, it } from 'vitest';

import { withRollback } from '../setup/database.setup';

/**
 * Tenant isolation, asserted against the policies rather than against the code (§4.1,
 * §10.6).
 *
 * Every route already checks the caller, and every one of those checks is a
 * convenience. The guarantee is here: with the session set to host A, host B's event
 * has to be invisible even to a query that names it by id. That is what makes a bug in
 * a Server Component a bug rather than a breach.
 *
 * These run as the real Postgres roles — `set local role` plus a JWT claim — not
 * through the Supabase client, so nothing in between can quietly add the filter that is
 * supposed to be the policy's job.
 *
 * Every test is wrapped in `withRollback`, so nothing it creates ever commits and
 * nothing it did not create is ever touched. That is why this suite is safe to run
 * against any database, including the one serving the live site.
 */

interface Tenant {
  readonly userId: string;
  readonly eventId: string;
  readonly publicId: string;
}

/** Creates an owner and one published event, as the privileged role. */
async function seedTenant(client: PoolClient, label: string): Promise<Tenant> {
  await client.query('reset role');
  const userId = randomUUID();
  const publicId = `rls${label}${Date.now()}`.slice(0, 12);

  await client.query(
    `insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                             email_confirmed_at, created_at, updated_at)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
             $2, '', now(), now(), now())`,
    [userId, `rls-${label}-${randomUUID()}@example.test`],
  );

  const { rows } = await client.query<{ id: string }>(
    `insert into public.events
       (owner_user_id, public_id, title, event_type, hosts_names, honoree_display_name,
        event_date, venue_name, address, is_active)
     values ($1, $2, $3, 'other', 'מארחים', 'חוגג', current_date + 30, 'אולם', 'כתובת', true)
     returning id`,
    [userId, publicId, `אירוע ${label}`],
  );

  return { userId, eventId: rows[0]!.id, publicId };
}

/** Switches the open transaction to a signed-in user, exactly as PostgREST would. */
async function becomeUser(client: PoolClient, userId: string): Promise<void> {
  await client.query('reset role');
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub: userId, role: 'authenticated' }),
  ]);
  await client.query('set local role authenticated');
}

async function becomeAnon(client: PoolClient): Promise<void> {
  await client.query('reset role');
  await client.query(`select set_config('request.jwt.claims', '', true)`);
  await client.query('set local role anon');
}

describe('tenant isolation', () => {
  it('lets a host read their own event', async () => {
    await withRollback(async (client) => {
      const alice = await seedTenant(client, 'a');
      await becomeUser(client, alice.userId);

      const { rows } = await client.query<{ id: string }>('select id from public.events');
      expect(rows.map((r) => r.id)).toEqual([alice.eventId]);
    });
  });

  /** The whole point. Asking for it by id must still return nothing. */
  it('hides another host’s event even when it is named directly', async () => {
    await withRollback(async (client) => {
      const alice = await seedTenant(client, 'a');
      const bob = await seedTenant(client, 'b');
      await becomeUser(client, alice.userId);

      const { rows } = await client.query('select id from public.events where id = $1', [
        bob.eventId,
      ]);
      expect(rows).toEqual([]);
    });
  });

  it('silently affects no rows when a host updates another host’s event', async () => {
    await withRollback(async (client) => {
      const alice = await seedTenant(client, 'a');
      const bob = await seedTenant(client, 'b');
      await becomeUser(client, alice.userId);

      const { rows } = await client.query(
        `update public.events set title = 'נחטף' where id = $1 returning id`,
        [bob.eventId],
      );
      // No error, no rows — which is exactly why the Server Action has to check the
      // affected count rather than only the error.
      expect(rows).toEqual([]);
    });
  });

  it('refuses to let a host hand their event to somebody else', async () => {
    await withRollback(async (client) => {
      const alice = await seedTenant(client, 'a');
      const bob = await seedTenant(client, 'b');
      await becomeUser(client, alice.userId);

      await expect(
        client.query('update public.events set owner_user_id = $1 where id = $2', [
          bob.userId,
          alice.eventId,
        ]),
      ).rejects.toThrow(/row-level security/i);
    });
  });

  it('refuses an insert that names another account as owner', async () => {
    await withRollback(async (client) => {
      const alice = await seedTenant(client, 'a');
      const bob = await seedTenant(client, 'b');
      await becomeUser(client, alice.userId);

      await expect(
        client.query(
          `insert into public.events
             (owner_user_id, public_id, title, event_type, hosts_names, honoree_display_name,
              event_date, venue_name, address, is_active)
           values ($1, 'stolenid1234', 'גנוב', 'other', 'x', 'y', current_date + 1, 'z', 'w', true)`,
          [bob.userId],
        ),
      ).rejects.toThrow(/row-level security/i);
    });
  });

  it('hides another host’s replies', async () => {
    await withRollback(async (client) => {
      const alice = await seedTenant(client, 'a');
      const bob = await seedTenant(client, 'b');

      await client.query(
        `insert into public.rsvps
           (event_id, full_name, phone, phone_normalized, attendance_status, consent, source)
         values ($1, 'אורח של בוב', '+972501112233', '+972501112233', 'attending', true, 'public_form')`,
        [bob.eventId],
      );

      await becomeUser(client, alice.userId);
      const { rows } = await client.query('select id from public.rsvps');
      expect(rows).toEqual([]);
    });
  });
});

describe('the anonymous surface', () => {
  it('cannot select from events, rsvps or guests', async () => {
    await withRollback(async (client) => {
      await becomeAnon(client);
      for (const table of ['events', 'rsvps', 'guests']) {
        await expect(client.query(`select id from public.${table}`)).rejects.toThrow(
          /permission denied/i,
        );
        // A refused statement aborts the transaction; restart so the next one runs.
        await client.query('rollback');
        await client.query('begin');
        await becomeAnon(client);
      }
    });
  });

  /** The one thing it may do — and only with the unguessable id. */
  it('may read a published event through the projection', async () => {
    await withRollback(async (client) => {
      const host = await seedTenant(client, 'p');
      await becomeAnon(client);

      const { rows } = await client.query<{ id: string | null }>(
        'select (public.get_public_event_by_public_id($1)).id as id',
        [host.publicId],
      );
      expect(rows[0]?.id).toBe(host.eventId);
    });
  });

  it('gets nothing for an id that does not exist', async () => {
    await withRollback(async (client) => {
      await becomeAnon(client);
      const { rows } = await client.query<{ id: string | null }>(
        'select (public.get_public_event_by_public_id($1)).id as id',
        ['doesnotexist'],
      );
      expect(rows[0]?.id).toBeNull();
    });
  });

  /**
   * An unpublished event and a nonexistent one are indistinguishable from outside.
   * Telling them apart would make the id space enumerable one probe at a time (§4.2).
   */
  it('gets nothing for an unpublished event, exactly as for a missing one', async () => {
    await withRollback(async (client) => {
      const host = await seedTenant(client, 'u');
      await client.query('update public.events set is_active = false where id = $1', [
        host.eventId,
      ]);
      await becomeAnon(client);

      const { rows } = await client.query<{ id: string | null }>(
        'select (public.get_public_event_by_public_id($1)).id as id',
        [host.publicId],
      );
      expect(rows[0]?.id).toBeNull();
    });
  });

  it('cannot call the rate limiter', async () => {
    await withRollback(async (client) => {
      await becomeAnon(client);
      await expect(client.query(`select public.consume_rate_limit('k', 1, 60)`)).rejects.toThrow(
        /permission denied/i,
      );
    });
  });

  it('cannot call the retention purge', async () => {
    await withRollback(async (client) => {
      await becomeAnon(client);
      await expect(
        client.query('select public.purge_expired_guest_data(365, 365, true)'),
      ).rejects.toThrow(/permission denied/i);
    });
  });

  /** Retired in 20260726001200 — it returned an arbitrary active event with no id. */
  it('has no unaddressed get_public_event() to fall back on', async () => {
    await withRollback(async (client) => {
      await becomeAnon(client);
      await expect(client.query('select public.get_public_event()')).rejects.toThrow(
        /does not exist|permission denied/i,
      );
    });
  });
});
