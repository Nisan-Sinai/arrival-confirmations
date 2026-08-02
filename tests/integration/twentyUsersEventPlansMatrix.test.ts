import { randomUUID } from 'node:crypto';

import type { PoolClient } from 'pg';
import { describe, expect, it } from 'vitest';

import { getPlanDefinition, type PlanCode } from '@/app/_lib/plans';

import { withRollback } from '../setup/database.setup';

const USER_COUNT = 20;
const EVENTS_PER_USER = 10;
const TOTAL_EVENTS = USER_COUNT * EVENTS_PER_USER;
const PLAN_SEQUENCE = [
  'trial',
  'basic',
  'premium',
  'pro',
  'trial',
  'basic',
  'premium',
  'pro',
  'trial',
  'basic',
] as const satisfies readonly Exclude<PlanCode, 'legacy'>[];
const EVENT_TYPES = ['wedding', 'bar_mitzvah', 'brit_mila', 'birthday', 'other'] as const;
const PAYMENT_METHODS = ['phone', 'bit', 'bank_transfer', 'cash', 'other'] as const;

type TestPlan = (typeof PLAN_SEQUENCE)[number];

interface SeededUser {
  readonly id: string;
  readonly email: string;
  readonly userNumber: number;
}

interface SeededEvent {
  readonly id: string;
  readonly ownerId: string;
  readonly publicId: string;
  readonly plan: TestPlan;
  readonly priceAgorot: number;
  readonly attendeeLimit: number;
}

interface CountSummary {
  readonly row_count: string;
  readonly distinct_count: string;
}

interface EventRow {
  readonly id: string;
  readonly owner_user_id: string;
  readonly public_id: string;
  readonly expected_guests: number;
}

interface LicenseRow {
  readonly entity_id: string;
  readonly admin_user_id: string | null;
  readonly metadata: Record<string, unknown>;
}

async function seedUsers(client: PoolClient): Promise<SeededUser[]> {
  const runId = randomUUID();
  const users: SeededUser[] = [];

  for (let userNumber = 1; userNumber <= USER_COUNT; userNumber += 1) {
    users.push({
      id: randomUUID(),
      email: `qa-20-users-${runId}-${String(userNumber).padStart(2, '0')}@example.test`,
      userNumber,
    });
  }

  await client.query(
    `insert into auth.users
       (id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at)
     select
       seeded.id,
       '00000000-0000-0000-0000-000000000000',
       'authenticated',
       'authenticated',
       seeded.email,
       '',
       now(),
       now(),
       now()
     from unnest($1::uuid[], $2::text[]) as seeded(id, email)`,
    [users.map((user) => user.id), users.map((user) => user.email)],
  );

  return users;
}

async function seedEvents(
  client: PoolClient,
  users: readonly SeededUser[],
): Promise<SeededEvent[]> {
  const events: SeededEvent[] = [];

  for (const user of users) {
    for (let eventNumber = 1; eventNumber <= EVENTS_PER_USER; eventNumber += 1) {
      const plan = PLAN_SEQUENCE[eventNumber - 1]!;
      const planDefinition = getPlanDefinition(plan);
      if (planDefinition === null) throw new Error(`Missing plan definition for ${plan}`);

      const publicId = `qa20u${String(user.userNumber).padStart(2, '0')}event${String(eventNumber).padStart(2, '0')}`;
      const eventType = EVENT_TYPES[(eventNumber - 1) % EVENT_TYPES.length]!;
      const eventResult = await client.query<{ id: string }>(
        `insert into public.events
           (owner_user_id, public_id, event_type, title, hosts_names,
            honoree_display_name, event_date, ceremony_time, venue_name,
            address, contact_phone, description, expected_guests, is_active)
         values
           ($1, $2, $3, $4, $5, $6, current_date + $7::integer,
            '19:00', $8, $9, $10, $11, $12, $13)
         returning id`,
        [
          user.id,
          publicId,
          eventType,
          `אירוע ${eventNumber} של משתמש ${user.userNumber}`,
          `משפחת QA ${user.userNumber}`,
          `חוגג ${user.userNumber}-${eventNumber}`,
          user.userNumber * EVENTS_PER_USER + eventNumber,
          `אולם QA ${user.userNumber}-${eventNumber}`,
          `רחוב הבדיקה ${eventNumber}, נתניה`,
          `050${String(user.userNumber).padStart(2, '0')}${String(eventNumber).padStart(2, '0')}000`,
          `בדיקת 20 משתמשים — מסלול ${plan}`,
          planDefinition.attendeeLimit,
          eventNumber % 5 !== 0,
        ],
      );
      const eventId = eventResult.rows[0]!.id;
      const status = plan === 'trial' ? 'trial' : 'active';
      const paymentMethod =
        plan === 'trial' ? null : PAYMENT_METHODS[(eventNumber - 1) % PAYMENT_METHODS.length]!;

      await client.query(
        `insert into public.audit_logs
           (admin_user_id, action, entity_type, entity_id, metadata)
         values
           ($1::uuid, 'event_license_updated', 'event_license', $2::uuid,
            jsonb_build_object(
              'event_id', ($2::uuid)::text,
              'plan', $3::text,
              'status', $4::text,
              'price_agorot', $5::integer,
              'payment_method', $6::text,
              'payment_reference', $7::text,
              'notes', $8::text
            ))`,
        [
          user.id,
          eventId,
          plan,
          status,
          planDefinition.priceAgorot,
          paymentMethod,
          paymentMethod === null
            ? null
            : `QA-${String(user.userNumber).padStart(2, '0')}-${String(eventNumber).padStart(2, '0')}`,
          `מנוי ${plan} לאירוע ${eventNumber} של משתמש ${user.userNumber}`,
        ],
      );

      events.push({
        id: eventId,
        ownerId: user.id,
        publicId,
        plan,
        priceAgorot: planDefinition.priceAgorot,
        attendeeLimit: planDefinition.attendeeLimit,
      });
    }
  }

  return events;
}

async function becomeUser(client: PoolClient, userId: string): Promise<void> {
  await client.query('reset role');
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub: userId, role: 'authenticated' }),
  ]);
  await client.query('set local role authenticated');
}

async function expectDatabaseFailure(
  client: PoolClient,
  statement: () => Promise<unknown>,
  expected: RegExp,
): Promise<void> {
  await client.query('savepoint expected_failure');
  try {
    await statement();
    throw new Error('The database unexpectedly accepted an invalid cross-tenant write.');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(expected);
  } finally {
    await client.query('rollback to savepoint expected_failure');
    await client.query('release savepoint expected_failure');
  }
}

function planCounts(rows: readonly { plan: string; total: string }[]): Record<string, number> {
  return Object.fromEntries(rows.map((row) => [row.plan, Number(row.total)]));
}

describe('20-user event subscription matrix', () => {
  it('isolates 20 unique accounts with 10 independently licensed events each', async () => {
    await withRollback(async (client) => {
      const startedAt = performance.now();
      const users = await seedUsers(client);
      const events = await seedEvents(client, users);

      expect(users).toHaveLength(USER_COUNT);
      expect(events).toHaveLength(TOTAL_EVENTS);

      const userSummary = await client.query<CountSummary>(
        `select count(*) as row_count, count(distinct email) as distinct_count
           from auth.users
          where id = any($1::uuid[])`,
        [users.map((user) => user.id)],
      );
      expect(Number(userSummary.rows[0]!.row_count)).toBe(USER_COUNT);
      expect(Number(userSummary.rows[0]!.distinct_count)).toBe(USER_COUNT);

      const eventRowsResult = await client.query<EventRow>(
        `select id, owner_user_id, public_id, expected_guests
           from public.events
          where id = any($1::uuid[])`,
        [events.map((event) => event.id)],
      );
      expect(eventRowsResult.rows).toHaveLength(TOTAL_EVENTS);
      expect(new Set(eventRowsResult.rows.map((event) => event.public_id)).size).toBe(TOTAL_EVENTS);

      const eventRows = new Map(eventRowsResult.rows.map((event) => [event.id, event]));
      for (const event of events) {
        const stored = eventRows.get(event.id);
        expect(stored?.owner_user_id).toBe(event.ownerId);
        expect(stored?.public_id).toBe(event.publicId);
        expect(stored?.expected_guests).toBe(event.attendeeLimit);
      }

      const ownerCounts = await client.query<{ owner_user_id: string; total: string }>(
        `select owner_user_id, count(*) as total
           from public.events
          where id = any($1::uuid[])
          group by owner_user_id`,
        [events.map((event) => event.id)],
      );
      expect(ownerCounts.rows).toHaveLength(USER_COUNT);
      for (const row of ownerCounts.rows) expect(Number(row.total)).toBe(EVENTS_PER_USER);

      const licenseRowsResult = await client.query<LicenseRow>(
        `select entity_id, admin_user_id, metadata
           from public.audit_logs
          where entity_type = 'event_license'
            and action = 'event_license_updated'
            and entity_id = any($1::uuid[])`,
        [events.map((event) => event.id)],
      );
      expect(licenseRowsResult.rows).toHaveLength(TOTAL_EVENTS);

      const licenseRows = new Map(
        licenseRowsResult.rows.map((license) => [license.entity_id, license]),
      );
      for (const event of events) {
        const license = licenseRows.get(event.id);
        expect(license?.admin_user_id).toBe(event.ownerId);
        expect(license?.metadata['event_id']).toBe(event.id);
        expect(license?.metadata['plan']).toBe(event.plan);
        expect(license?.metadata['status']).toBe(event.plan === 'trial' ? 'trial' : 'active');
        expect(license?.metadata['price_agorot']).toBe(event.priceAgorot);
      }

      const duplicateLicenses = await client.query(
        `select event.id
           from public.events event
           left join public.audit_logs license
             on license.entity_id = event.id
            and license.entity_type = 'event_license'
            and license.action = 'event_license_updated'
          where event.id = any($1::uuid[])
          group by event.id
         having count(license.id) <> 1`,
        [events.map((event) => event.id)],
      );
      expect(duplicateLicenses.rows).toEqual([]);

      const totalPlanDistribution = await client.query<{ plan: string; total: string }>(
        `select metadata ->> 'plan' as plan, count(*) as total
           from public.audit_logs
          where entity_type = 'event_license'
            and entity_id = any($1::uuid[])
          group by metadata ->> 'plan'
          order by metadata ->> 'plan'`,
        [events.map((event) => event.id)],
      );
      expect(planCounts(totalPlanDistribution.rows)).toEqual({
        basic: 60,
        premium: 40,
        pro: 40,
        trial: 60,
      });

      for (const user of users) {
        await becomeUser(client, user.id);

        const visibleEvents = await client.query<{
          total: string;
          distinct_owners: string;
          owner_user_id: string;
        }>(
          `select
             count(*) as total,
             count(distinct owner_user_id) as distinct_owners,
             min(owner_user_id::text)::uuid as owner_user_id
           from public.events`,
        );
        expect(Number(visibleEvents.rows[0]!.total)).toBe(EVENTS_PER_USER);
        expect(Number(visibleEvents.rows[0]!.distinct_owners)).toBe(1);
        expect(visibleEvents.rows[0]!.owner_user_id).toBe(user.id);

        const visiblePlans = await client.query<{ plan: string; total: string }>(
          `select metadata ->> 'plan' as plan, count(*) as total
             from public.audit_logs
            where entity_type = 'event_license'
            group by metadata ->> 'plan'
            order by metadata ->> 'plan'`,
        );
        expect(planCounts(visiblePlans.rows)).toEqual({
          basic: 3,
          premium: 2,
          pro: 2,
          trial: 3,
        });

        const ownEvent = events.find((event) => event.ownerId === user.id)!;
        const foreignEvent = events.find((event) => event.ownerId !== user.id)!;
        const foreignUpdate = await client.query<{ id: string }>(
          `update public.events
              set title = 'שינוי אסור בין משתמשים'
            where id = $1
          returning id`,
          [foreignEvent.id],
        );
        expect(foreignUpdate.rows).toEqual([]);

        const ownUpdate = await client.query<{ id: string }>(
          `update public.events
              set title = title || ' — נבדק'
            where id = $1
          returning id`,
          [ownEvent.id],
        );
        expect(ownUpdate.rows[0]?.id).toBe(ownEvent.id);

        await expectDatabaseFailure(
          client,
          () =>
            client.query(
              `update public.events
                  set owner_user_id = $2
                where id = $1`,
              [ownEvent.id, foreignEvent.ownerId],
            ),
          /row-level security|violates row-level security/i,
        );
      }

      await client.query('reset role');

      console.info(
        `✅ ${USER_COUNT} unique users, ${TOTAL_EVENTS} events and ${TOTAL_EVENTS} independent licenses validated in ${Math.round(performance.now() - startedAt)}ms`,
      );
    });
  });
});
