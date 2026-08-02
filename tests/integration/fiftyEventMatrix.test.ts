import { randomUUID } from 'node:crypto';

import type { PoolClient } from 'pg';
import { describe, expect, it } from 'vitest';

import { withRollback } from '../setup/database.setup';

const EVENT_COUNT = 50;
const OWNER_COUNT = 5;
const EVENT_TYPES = [
  'brit_mila',
  'britah',
  'pidyon_haben',
  'upsherin',
  'bar_mitzvah',
  'bat_mitzvah',
  'engagement',
  'henna',
  'wedding',
  'birthday',
  'other',
] as const;
const PLANS = ['basic', 'premium', 'pro'] as const;

interface SeededEvent {
  readonly id: string;
  readonly publicId: string;
  readonly ownerId: string;
  readonly guestCount: number;
  readonly active: boolean;
  readonly tableIds: readonly string[];
}

interface MatrixSummary {
  readonly guest_count: string;
  readonly rsvp_count: string;
  readonly confirmed_people: string;
  readonly table_count: string;
  readonly table_capacity: string;
  readonly seated_guests: string;
  readonly snapshot_count: string;
  readonly queued_messages: string;
}

async function seedOwners(client: PoolClient): Promise<string[]> {
  const ownerIds: string[] = [];

  for (let index = 1; index <= OWNER_COUNT; index += 1) {
    const id = randomUUID();
    ownerIds.push(id);
    await client.query(
      `insert into auth.users
         (id, instance_id, aud, role, email, encrypted_password,
          email_confirmed_at, created_at, updated_at)
       values
         ($1, '00000000-0000-0000-0000-000000000000', 'authenticated',
          'authenticated', $2, '', now(), now(), now())`,
      [id, `qa-50-owner-${index}-${randomUUID()}@example.test`],
    );
  }

  return ownerIds;
}

async function seedEvent(
  client: PoolClient,
  ownerIds: readonly string[],
  eventNumber: number,
): Promise<SeededEvent> {
  const ownerId = ownerIds[(eventNumber - 1) % ownerIds.length]!;
  const publicId = `qa50event${String(eventNumber).padStart(3, '0')}`;
  const active = eventNumber % 10 !== 0;
  const eventType = EVENT_TYPES[(eventNumber - 1) % EVENT_TYPES.length]!;
  const primaryColor = `#${(0x110000 + eventNumber * 1379).toString(16).slice(-6).padStart(6, '0')}`;
  const accentColor = `#${(0x330000 + eventNumber * 1877).toString(16).slice(-6).padStart(6, '0')}`;

  const eventResult = await client.query<{ id: string }>(
    `insert into public.events
       (owner_user_id, public_id, event_type, title, hosts_names,
        honoree_display_name, event_date, ceremony_time, reception_time,
        venue_name, address, waze_url, google_maps_url, contact_phone,
        description, side_a_label, side_b_label, expected_guests, is_active,
        brand_primary_color, brand_accent_color, invitation_style)
     values
       ($1, $2, $3, $4, $5, $6, current_date + $7::integer,
        '19:00', '18:00', $8, $9, $10, $11, $12, $13,
        'צד א', 'צד ב', $14, $15, $16, $17, $18)
     returning id`,
    [
      ownerId,
      publicId,
      eventType,
      `אירוע בדיקת QA ${eventNumber}`,
      `משפחת בדיקה ${eventNumber}`,
      `חוגג ${eventNumber}`,
      eventNumber,
      `אולם ${eventNumber}`,
      `רחוב הבדיקה ${eventNumber}, נתניה`,
      `https://waze.com/ul/qa-${eventNumber}`,
      `https://maps.google.com/?q=qa-${eventNumber}`,
      `050000${String(eventNumber).padStart(4, '0')}`,
      `אירוע אוטומטי מספר ${eventNumber}`,
      eventNumber,
      active,
      primaryColor,
      accentColor,
      eventNumber % 3 === 0 ? 'minimal' : eventNumber % 2 === 0 ? 'modern' : 'classic',
    ],
  );
  const eventId = eventResult.rows[0]!.id;

  const plan = PLANS[(eventNumber - 1) % PLANS.length]!;
  const priceAgorot = plan === 'basic' ? 9_900 : plan === 'premium' ? 19_900 : 34_900;
  await client.query(
    `insert into public.audit_logs
       (admin_user_id, action, entity_type, entity_id, metadata)
     values
       ($1, 'event_license_updated', 'event_license', $2,
        jsonb_build_object(
          'event_id', $2::text,
          'plan', $3::text,
          'status', 'active',
          'price_agorot', $4::integer,
          'payment_method', 'phone'
        ))`,
    [ownerId, eventId, plan, priceAgorot],
  );

  const tableCount = Math.ceil(eventNumber / 10);
  const tableResult = await client.query<{ id: string; sort_order: number }>(
    `insert into public.event_seating_tables
       (event_id, name, shape, capacity, zone, notes, sort_order)
     select
       $1,
       'שולחן ' || table_number,
       case (table_number - 1) % 4
         when 0 then 'round'
         when 1 then 'rectangle'
         when 2 then 'square'
         else 'banquet'
       end,
       10,
       case when table_number % 2 = 0 then 'מרכז' else 'קדמי' end,
       'נוצר בבדיקת 50 אירועים',
       table_number
     from generate_series(1, $2::integer) as table_number
     returning id, sort_order`,
    [eventId, tableCount],
  );
  const tableIds = [...tableResult.rows]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((row) => row.id);

  await client.query(
    `insert into public.guests
       (event_id, full_name, phone, phone_normalized, family_side,
        invite_token_hash, token_expires_at, is_active, email, party_size,
        table_id, table_name, seat_number, seating_group, meal_preference,
        accessibility_needs, seating_priority, seat_locked, import_source, notes)
     select
       $1,
       'אורח ' || $2::integer || '-' || guest_number,
       '+9725' || lpad($2::text, 2, '0') || lpad(guest_number::text, 6, '0'),
       '+9725' || lpad($2::text, 2, '0') || lpad(guest_number::text, 6, '0'),
       case guest_number % 3
         when 0 then 'other'::public.family_side
         when 1 then 'side_a'::public.family_side
         else 'side_b'::public.family_side
       end,
       'qa50-invite-' || $2::integer || '-' || guest_number,
       now() + interval '30 days',
       true,
       'qa-' || $2::integer || '-' || guest_number || '@example.test',
       1,
       ($3::uuid[])[((guest_number - 1) / 10) + 1],
       'שולחן ' || (((guest_number - 1) / 10) + 1),
       guest_number::text,
       'משפחה ' || ceil(guest_number / 5.0),
       case guest_number % 4
         when 0 then 'טבעוני'
         when 1 then 'רגיל'
         when 2 then 'צמחוני'
         else 'ללא גלוטן'
       end,
       case when guest_number % 17 = 0 then 'גישה לכיסא גלגלים' else null end,
       guest_number % 11,
       guest_number % 13 = 0,
       case guest_number % 3
         when 0 then 'manual'
         when 1 then 'csv'
         else 'xlsx'
       end,
       guest_number::text
     from generate_series(1, $4::integer) as guest_number`,
    [eventId, eventNumber, tableIds, eventNumber],
  );

  await client.query(
    `with event_guests as (
       select
         guest.*,
         guest.notes::integer as guest_number,
         case guest.notes::integer % 3
           when 0 then 'not_attending'::public.attendance_status
           when 1 then 'attending'::public.attendance_status
           else 'maybe'::public.attendance_status
         end as status
       from public.guests guest
       where guest.event_id = $1
     )
     insert into public.rsvps
       (event_id, guest_id, full_name, phone, phone_normalized, family_side,
        attendance_status, adults_count, children_count, babies_count,
        dietary_requirements, notes, consent, source, update_token_hash,
        update_token_expires_at)
     select
       event_id,
       id,
       full_name,
       phone,
       phone_normalized,
       family_side,
       status,
       case when status = 'not_attending' then 0 else 1 end,
       0,
       0,
       meal_preference,
       'נוצר במטריצת QA',
       true,
       case when guest_number % 2 = 0
         then 'public_form'::public.rsvp_source
         else 'personal_link'::public.rsvp_source
       end,
       'qa50-update-' || id::text,
       now() + interval '30 days'
     from event_guests`,
    [eventId],
  );

  await client.query(
    `insert into public.event_seating_snapshots
       (event_id, label, layout, created_by)
     values
       ($1, $2, jsonb_build_object('tables', $3::integer, 'guests', $4::integer), $5)`,
    [eventId, `נקודת שחזור ${eventNumber}`, tableCount, eventNumber, ownerId],
  );

  return {
    id: eventId,
    publicId,
    ownerId,
    guestCount: eventNumber,
    active,
    tableIds,
  };
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
    throw new Error('The database unexpectedly accepted an invalid write.');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(expected);
  } finally {
    await client.query('rollback to savepoint expected_failure');
    await client.query('release savepoint expected_failure');
  }
}

describe('50-event QA matrix', () => {
  it(
    'creates, isolates, publishes, seats and validates 50 events with different guest counts',
    async () => {
      await withRollback(async (client) => {
        const startedAt = performance.now();
        const ownerIds = await seedOwners(client);
        const events: SeededEvent[] = [];

        for (let eventNumber = 1; eventNumber <= EVENT_COUNT; eventNumber += 1) {
          events.push(await seedEvent(client, ownerIds, eventNumber));
        }

        for (const event of events) {
          const summaryResult = await client.query<MatrixSummary>(
            `select
               (select count(*) from public.guests where event_id = $1) as guest_count,
               (select count(*) from public.rsvps where event_id = $1) as rsvp_count,
               (select coalesce(sum(adults_count + children_count + babies_count), 0)
                  from public.rsvps where event_id = $1) as confirmed_people,
               (select count(*) from public.event_seating_tables where event_id = $1) as table_count,
               (select coalesce(sum(capacity), 0)
                  from public.event_seating_tables where event_id = $1) as table_capacity,
               (select count(*) from public.guests
                  where event_id = $1 and table_id is not null) as seated_guests,
               (select count(*) from public.event_seating_snapshots where event_id = $1)
                 as snapshot_count,
               (select count(*) from public.event_messages where event_id = $1)
                 as queued_messages`,
            [event.id],
          );
          const summary = summaryResult.rows[0]!;
          const expectedConfirmed = event.guestCount - Math.floor(event.guestCount / 3);

          expect(Number(summary.guest_count)).toBe(event.guestCount);
          expect(Number(summary.rsvp_count)).toBe(event.guestCount);
          expect(Number(summary.confirmed_people)).toBe(expectedConfirmed);
          expect(Number(summary.table_count)).toBe(Math.ceil(event.guestCount / 10));
          expect(Number(summary.table_capacity)).toBeGreaterThanOrEqual(event.guestCount);
          expect(Number(summary.seated_guests)).toBe(event.guestCount);
          expect(Number(summary.snapshot_count)).toBe(1);
          expect(Number(summary.queued_messages)).toBe(0);

          const overCapacity = await client.query(
            `select seating_table.id
             from public.event_seating_tables seating_table
             left join public.guests guest on guest.table_id = seating_table.id and guest.is_active
             where seating_table.event_id = $1
             group by seating_table.id, seating_table.capacity
             having coalesce(sum(guest.party_size), 0) > seating_table.capacity`,
            [event.id],
          );
          expect(overCapacity.rows).toEqual([]);

          const publicProjection = await client.query<{
            id: string | null;
            public_id: string | null;
          }>(
            `select
               (public.get_public_event_by_public_id($1)).id as id,
               (public.get_public_event_by_public_id($1)).public_id as public_id`,
            [event.publicId],
          );
          expect(publicProjection.rows[0]?.id).toBe(event.active ? event.id : null);
          expect(publicProjection.rows[0]?.public_id).toBe(event.active ? event.publicId : null);

          const brandingResult = await client.query<{ branding: Record<string, unknown> | null }>(
            'select public.get_public_event_branding($1) as branding',
            [event.publicId],
          );
          expect(brandingResult.rows[0]?.branding === null).toBe(!event.active);
        }

        const licenseDistribution = await client.query<{ plan: string; total: string }>(
          `select metadata ->> 'plan' as plan, count(*) as total
           from public.audit_logs
           where entity_type = 'event_license'
             and entity_id = any($1::uuid[])
           group by metadata ->> 'plan'
           order by plan`,
          [events.map((event) => event.id)],
        );
        expect(
          licenseDistribution.rows.reduce(
            (total, row) => total + Number(row.total),
            0,
          ),
        ).toBe(EVENT_COUNT);
        expect(licenseDistribution.rows.map((row) => row.plan).sort()).toEqual([
          'basic',
          'premium',
          'pro',
        ]);

        const firstEvent = events[0]!;
        await expectDatabaseFailure(
          client,
          () =>
            client.query(
              `insert into public.guests
                 (event_id, full_name, phone, phone_normalized, party_size, import_source)
               select event_id, 'כפול', phone, phone_normalized, 1, 'manual'
               from public.guests
               where event_id = $1
               limit 1`,
              [firstEvent.id],
            ),
          /guests_unique_phone_per_event|duplicate key/i,
        );

        const secondEvent = events[1]!;
        await expectDatabaseFailure(
          client,
          () =>
            client.query(
              `update public.guests
               set table_id = $1
               where event_id = $2
                 and id = (select id from public.guests where event_id = $2 limit 1)`,
              [firstEvent.tableIds[0], secondEvent.id],
            ),
          /Seating table must belong to the same event/i,
        );

        const ownerOneEvents = events.filter((event) => event.ownerId === ownerIds[0]);
        await becomeUser(client, ownerIds[0]!);
        const visibleEvents = await client.query<{ id: string }>(
          'select id from public.events order by created_at, id',
        );
        expect(visibleEvents.rows.map((row) => row.id).sort()).toEqual(
          ownerOneEvents.map((event) => event.id).sort(),
        );

        const foreignEvent = events.find((event) => event.ownerId !== ownerIds[0])!;
        const hiddenForeignEvent = await client.query(
          'select id from public.events where id = $1',
          [foreignEvent.id],
        );
        expect(hiddenForeignEvent.rows).toEqual([]);
        await client.query('reset role');

        const eventToDelete = events.at(-1)!;
        await client.query('delete from public.events where id = $1', [eventToDelete.id]);
        const cascadedRows = await client.query<{ related_rows: string }>(
          `select
             (select count(*) from public.guests where event_id = $1)
             + (select count(*) from public.rsvps where event_id = $1)
             + (select count(*) from public.event_seating_tables where event_id = $1)
             + (select count(*) from public.event_seating_snapshots where event_id = $1)
             + (select count(*) from public.audit_logs where entity_id = $1)
             as related_rows`,
          [eventToDelete.id],
        );
        expect(Number(cascadedRows.rows[0]?.related_rows)).toBe(1);
        // Audit history deliberately survives event deletion because entity_id is not a foreign key.
        const survivingAudit = await client.query(
          `select id from public.audit_logs
           where entity_id = $1 and entity_type = 'event_license'`,
          [eventToDelete.id],
        );
        expect(survivingAudit.rows).toHaveLength(1);

        const elapsedMs = Math.round(performance.now() - startedAt);
        console.log(
          `✅ 50 events, 1,275 guests, 1,275 RSVPs and ${events.reduce(
            (total, event) => total + event.tableIds.length,
            0,
          )} seating tables validated in ${elapsedMs}ms`,
        );
      });
    },
    120_000,
  );
});
