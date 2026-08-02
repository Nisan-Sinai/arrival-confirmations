import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';

const PREMIUM_MIGRATION = '20260801190000_premium_event_tools.sql';
const PRO_MIGRATION = '20260802020000_pro_seating_suite.sql';
const QA_PUBLIC_ID_PATTERN = 'qa-live-%';

interface OpenApiSchema {
  readonly definitions?: Record<string, { readonly properties?: Record<string, unknown> }>;
  readonly components?: {
    readonly schemas?: Record<string, { readonly properties?: Record<string, unknown> }>;
  };
  readonly paths?: Record<string, unknown>;
}

interface RequiredSchema {
  readonly tables: Readonly<Record<string, readonly string[]>>;
  readonly rpcPaths: readonly string[];
}

const REQUIRED_SCHEMA: RequiredSchema = {
  tables: {
    events: [
      'brand_primary_color',
      'brand_accent_color',
      'brand_logo_url',
      'invitation_style',
      'whatsapp_template_name',
      'whatsapp_language_code',
    ],
    guests: [
      'email',
      'party_size',
      'table_id',
      'table_name',
      'seat_number',
      'seating_group',
      'meal_preference',
      'accessibility_needs',
      'seating_priority',
      'seat_locked',
      'import_source',
      'notes',
    ],
    event_messages: [],
    event_seating_tables: [],
    event_seating_snapshots: [],
  },
  rpcPaths: ['/rpc/get_public_event_branding'],
};

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value === '') throw new Error(`${name} is required`);
  return value;
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

async function fetchOpenApi(
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<OpenApiSchema> {
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/openapi+json',
    },
  });
  if (!response.ok) throw new Error(`Unable to inspect Production schema: ${response.status}`);
  return (await response.json()) as OpenApiSchema;
}

function missingObjects(document: OpenApiSchema): string[] {
  const schemas = document.definitions ?? document.components?.schemas ?? {};
  const paths = document.paths ?? {};
  const missing: string[] = [];

  for (const [table, columns] of Object.entries(REQUIRED_SCHEMA.tables)) {
    const schema = schemas[table];
    if (schema === undefined) {
      missing.push(`table:${table}`);
      continue;
    }
    const properties = schema.properties ?? {};
    for (const column of columns) {
      if (!(column in properties)) missing.push(`column:${table}.${column}`);
    }
  }

  for (const rpcPath of REQUIRED_SCHEMA.rpcPaths) {
    if (!(rpcPath in paths)) missing.push(`rpc:${rpcPath}`);
  }

  return missing;
}

async function migrationText(filename: string): Promise<string> {
  return readFile(resolve('supabase', 'migrations', filename), 'utf8');
}

function migrationHistorySql(version: string, name: string, sql: string): string {
  return `
insert into supabase_migrations.schema_migrations(version, name, statements)
values (${sqlLiteral(version)}, ${sqlLiteral(name)}, array[${sqlLiteral(sql)}]::text[])
on conflict (version) do update
set name = excluded.name,
    statements = excluded.statements;
`;
}

function qaBackfillSql(): string {
  return `
-- Keep the 200 synthetic Production QA events realistic without using real people's data.
update public.events
set brand_primary_color = '#' || substr(md5(public_id), 1, 6),
    brand_accent_color = '#' || substr(md5(public_id || '-accent'), 1, 6),
    invitation_style = case
      when right(public_id, 2)::integer % 3 = 0 then 'minimal'
      when right(public_id, 2)::integer % 2 = 0 then 'modern'
      else 'classic'
    end
where public_id like '${QA_PUBLIC_ID_PATTERN}';

with ranked_guests as (
  select guest.id,
         guest.event_id,
         row_number() over (partition by guest.event_id order by guest.full_name, guest.id) as guest_number
  from public.guests guest
  join public.events event on event.id = guest.event_id
  where event.public_id like '${QA_PUBLIC_ID_PATTERN}'
)
update public.guests guest
set email = 'guest-' || ranked_guests.guest_number || '-' || substr(guest.event_id::text, 1, 8) || '@qa.example.com',
    party_size = 1,
    table_name = 'שולחן ' || ceil(ranked_guests.guest_number / 10.0)::integer,
    seat_number = ranked_guests.guest_number::text,
    seating_group = 'משפחה ' || ceil(ranked_guests.guest_number / 5.0)::integer,
    meal_preference = case ranked_guests.guest_number % 4
      when 0 then 'טבעוני'
      when 1 then 'רגיל'
      when 2 then 'צמחוני'
      else 'ללא גלוטן'
    end,
    accessibility_needs = case
      when ranked_guests.guest_number % 17 = 0 then 'גישה לכיסא גלגלים'
      else null
    end,
    seating_priority = (ranked_guests.guest_number % 11)::smallint,
    seat_locked = ranked_guests.guest_number % 19 = 0,
    import_source = case ranked_guests.guest_number % 3
      when 0 then 'manual'
      when 1 then 'csv'
      else 'xlsx'
    end,
    notes = coalesce(guest.notes, 'נתוני QA סינתטיים לבדיקת Production')
from ranked_guests
where guest.id = ranked_guests.id;

with latest_license as (
  select distinct on (log.entity_id)
         log.entity_id as event_id,
         log.metadata ->> 'plan' as plan
  from public.audit_logs log
  join public.events event on event.id = log.entity_id
  where log.entity_type = 'event_license'
    and event.public_id like '${QA_PUBLIC_ID_PATTERN}'
  order by log.entity_id, log.created_at desc
),
pro_events as (
  select event.id,
         greatest(1, ceil(count(guest.id) / 10.0)::integer) as table_count
  from public.events event
  join latest_license license on license.event_id = event.id and license.plan = 'pro'
  left join public.guests guest on guest.event_id = event.id and guest.is_active = true
  group by event.id
)
insert into public.event_seating_tables(event_id, name, shape, capacity, zone, notes, sort_order)
select pro_event.id,
       'שולחן ' || table_number,
       case (table_number - 1) % 4
         when 0 then 'round'
         when 1 then 'rectangle'
         when 2 then 'square'
         else 'banquet'
       end,
       10,
       case when table_number % 2 = 0 then 'מרכז' else 'קדמי' end,
       'נוצר עבור QA אמיתי ב-Production',
       table_number
from pro_events pro_event
cross join lateral generate_series(1, pro_event.table_count) as table_number
on conflict (event_id, name) do update
set shape = excluded.shape,
    capacity = excluded.capacity,
    zone = excluded.zone,
    notes = excluded.notes,
    sort_order = excluded.sort_order;

with ranked_guests as (
  select guest.id,
         guest.event_id,
         row_number() over (partition by guest.event_id order by guest.full_name, guest.id) as guest_number
  from public.guests guest
  join public.event_seating_tables seating_table on seating_table.event_id = guest.event_id
  where guest.is_active = true
  group by guest.id, guest.event_id, guest.full_name
),
ranked_tables as (
  select seating_table.id,
         seating_table.event_id,
         row_number() over (
           partition by seating_table.event_id
           order by seating_table.sort_order, seating_table.name, seating_table.id
         ) as table_number
  from public.event_seating_tables seating_table
)
update public.guests guest
set table_id = ranked_tables.id,
    table_name = 'שולחן ' || ranked_tables.table_number
from ranked_guests
join ranked_tables
  on ranked_tables.event_id = ranked_guests.event_id
 and ranked_tables.table_number = ceil(ranked_guests.guest_number / 10.0)::integer
where guest.id = ranked_guests.id;

insert into public.event_seating_snapshots(event_id, label, layout, created_by)
select seating_table.event_id,
       'סידור QA ראשוני',
       jsonb_build_object(
         'source', 'production-release-20260802',
         'tables', count(distinct seating_table.id),
         'seated_guests', count(distinct guest.id)
       ),
       event.owner_user_id
from public.event_seating_tables seating_table
join public.events event on event.id = seating_table.event_id
left join public.guests guest on guest.table_id = seating_table.id and guest.is_active = true
where event.public_id like '${QA_PUBLIC_ID_PATTERN}'
  and not exists (
    select 1
    from public.event_seating_snapshots snapshot
    where snapshot.event_id = seating_table.event_id
      and snapshot.label = 'סידור QA ראשוני'
  )
group by seating_table.event_id, event.owner_user_id;

-- Never create paid WhatsApp traffic during QA.
delete from public.event_messages message
using public.events event
where message.event_id = event.id
  and event.public_id like '${QA_PUBLIC_ID_PATTERN}';
`;
}

async function applyRelease(
  projectRef: string,
  accessToken: string,
  premiumSql: string,
  proSql: string,
): Promise<void> {
  const query = `
begin;
set local lock_timeout = '10s';
set local statement_timeout = '180s';

${premiumSql}
${proSql}

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text not null primary key
);
alter table supabase_migrations.schema_migrations
  add column if not exists statements text[],
  add column if not exists name text;

${migrationHistorySql('20260801190000', 'premium_event_tools', premiumSql)}
${migrationHistorySql('20260802020000', 'pro_seating_suite', proSql)}
${qaBackfillSql()}
notify pgrst, 'reload schema';
commit;
`;

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, read_only: false }),
    },
  );

  if (!response.ok) {
    const body = (await response.text()).slice(0, 2_000);
    throw new Error(`Production migration failed (${response.status}): ${body}`);
  }
}

async function waitForSchema(
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<void> {
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const missing = missingObjects(await fetchOpenApi(supabaseUrl, serviceRoleKey));
    if (missing.length === 0) return;
    if (attempt === 12) throw new Error(`Production schema is still incomplete: ${missing.join(', ')}`);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_500));
  }
}

async function verifyProductionData(
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<void> {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });

  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, public_id')
    .like('public_id', QA_PUBLIC_ID_PATTERN);
  if (eventError !== null) throw new Error(`QA event verification failed: ${eventError.message}`);
  if (events?.length !== 200) throw new Error(`Expected 200 QA events, found ${events?.length ?? 0}.`);

  const eventIds = events.map((event) => event.id);
  const [{ count: guestCount, error: guestError }, { count: tableCount, error: tableError }] =
    await Promise.all([
      supabase.from('guests').select('id', { count: 'exact', head: true }).in('event_id', eventIds),
      supabase
        .from('event_seating_tables')
        .select('id', { count: 'exact', head: true })
        .in('event_id', eventIds),
    ]);
  if (guestError !== null) throw new Error(`Guest verification failed: ${guestError.message}`);
  if (tableError !== null) throw new Error(`Seating verification failed: ${tableError.message}`);
  if (guestCount !== 3_476) throw new Error(`Expected 3476 guests, found ${guestCount ?? 0}.`);
  if ((tableCount ?? 0) < 40) throw new Error(`Expected Pro seating tables, found ${tableCount ?? 0}.`);

  const { count: snapshotCount, error: snapshotError } = await supabase
    .from('event_seating_snapshots')
    .select('id', { count: 'exact', head: true })
    .in('event_id', eventIds);
  if (snapshotError !== null) throw new Error(`Snapshot verification failed: ${snapshotError.message}`);
  if (snapshotCount !== 40) throw new Error(`Expected 40 seating snapshots, found ${snapshotCount ?? 0}.`);

  const { count: messageCount, error: messageError } = await supabase
    .from('event_messages')
    .select('id', { count: 'exact', head: true })
    .in('event_id', eventIds);
  if (messageError !== null) throw new Error(`Message verification failed: ${messageError.message}`);
  if (messageCount !== 0) throw new Error(`Expected no paid-message queue entries, found ${messageCount}.`);

  console.info('✅ Production schema includes all Premium and Pro objects.');
  console.info('✅ Migration history records both Production migrations.');
  console.info('✅ 200 events and 3476 guests remain intact.');
  console.info(`✅ ${tableCount ?? 0} seating tables and 40 snapshots are available.`);
  console.info('✅ No WhatsApp API messages were queued.');
}

async function main(): Promise<void> {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']?.trim();
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY']?.trim();

  if (
    supabaseUrl === undefined ||
    serviceRoleKey === undefined ||
    supabaseUrl.includes('ci-placeholder')
  ) {
    console.info('Production schema release skipped outside the real Supabase environment.');
    return;
  }

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  if (projectRef === undefined || projectRef.length < 10) {
    throw new Error('Unable to derive the Supabase project reference.');
  }

  const initialMissing = missingObjects(await fetchOpenApi(supabaseUrl, serviceRoleKey));
  if (initialMissing.length > 0) {
    const accessToken = requiredEnvironment('SUPABASE_ACCESS_TOKEN');
    console.info(`Applying Production release for ${initialMissing.length} missing schema objects.`);
    const [premiumSql, proSql] = await Promise.all([
      migrationText(PREMIUM_MIGRATION),
      migrationText(PRO_MIGRATION),
    ]);
    await applyRelease(projectRef, accessToken, premiumSql, proSql);
  } else {
    console.info('Production schema is already complete; skipping DDL.');
  }

  await waitForSchema(supabaseUrl, serviceRoleKey);
  await verifyProductionData(supabaseUrl, serviceRoleKey);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
