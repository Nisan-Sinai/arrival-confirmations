import { randomUUID } from 'node:crypto';

import { createClient, type User } from '@supabase/supabase-js';

import { getPlanDefinition, type PlanCode } from '../app/_lib/plans';

const PLATFORM_OWNER_EMAIL = 'nisan.sinai5@gmail.com';
const SEED_TAG = 'production-admin-demo-v1';
const USER_COUNT = 20;
const EVENTS_PER_USER = 10;
const EXPECTED_EVENT_COUNT = USER_COUNT * EVENTS_PER_USER;
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

type SeedPlan = (typeof PLAN_SEQUENCE)[number];

interface SeedUser {
  readonly id: string;
  readonly email: string;
  readonly userNumber: number;
}

interface SeedEvent {
  readonly id: string;
  readonly ownerId: string;
  readonly publicId: string;
  readonly plan: SeedPlan;
}

function requiredEnvironment(name: 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value === '') throw new Error(`${name} is required`);
  return value;
}

const supabaseUrl = requiredEnvironment('SUPABASE_URL');
const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

async function listAllUsers(): Promise<User[]> {
  const users: User[] = [];
  const perPage = 1_000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error !== null) throw new Error(`Unable to list auth users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < perPage) return users;
  }
}

function qaEmail(userNumber: number): string {
  return `qa-arrival-owner-${String(userNumber).padStart(2, '0')}@example.com`;
}

function isOurSeedUser(user: User): boolean {
  return user.user_metadata?.['qa_seed_tag'] === SEED_TAG;
}

async function ensurePlatformOwner(users: readonly User[]): Promise<User> {
  const owner = users.find((user) => user.email?.toLowerCase() === PLATFORM_OWNER_EMAIL);
  if (owner === undefined) {
    throw new Error(
      `Refusing to seed: ${PLATFORM_OWNER_EMAIL} was not found in the target Supabase project.`,
    );
  }
  if (typeof owner.email_confirmed_at !== 'string') {
    throw new Error(`Refusing to seed: ${PLATFORM_OWNER_EMAIL} is not email-confirmed.`);
  }
  return owner;
}

async function ensureSeedUsers(existingUsers: readonly User[]): Promise<SeedUser[]> {
  const byEmail = new Map(
    existingUsers
      .filter((user): user is User & { email: string } => typeof user.email === 'string')
      .map((user) => [user.email.toLowerCase(), user]),
  );
  const users: SeedUser[] = [];

  for (let userNumber = 1; userNumber <= USER_COUNT; userNumber += 1) {
    const email = qaEmail(userNumber);
    const existing = byEmail.get(email);

    if (existing !== undefined) {
      if (!isOurSeedUser(existing)) {
        throw new Error(`Refusing to reuse non-QA account ${email}.`);
      }
      users.push({ id: existing.id, email, userNumber });
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: `Qa-${randomUUID()}-A1!`,
      email_confirm: true,
      user_metadata: {
        display_name: `משתמש QA ${userNumber}`,
        qa_seed_tag: SEED_TAG,
      },
    });
    if (error !== null) throw new Error(`Unable to create ${email}: ${error.message}`);

    users.push({ id: data.user.id, email, userNumber });
  }

  return users;
}

function dateForEvent(userNumber: number, eventNumber: number): string {
  const date = new Date(Date.UTC(2026, 8, 1 + userNumber * EVENTS_PER_USER + eventNumber));
  return date.toISOString().slice(0, 10);
}

async function ensureEvent(
  user: SeedUser,
  eventNumber: number,
  platformOwnerId: string,
): Promise<SeedEvent> {
  const plan = PLAN_SEQUENCE[eventNumber - 1]!;
  const planDefinition = getPlanDefinition(plan);
  if (planDefinition === null) throw new Error(`Missing plan definition for ${plan}`);

  const publicId = `qa-prod-u${String(user.userNumber).padStart(2, '0')}-e${String(eventNumber).padStart(2, '0')}`;
  const eventType = EVENT_TYPES[(eventNumber - 1) % EVENT_TYPES.length]!;
  const eventPayload = {
    owner_user_id: user.id,
    public_id: publicId,
    event_type: eventType,
    title: `[QA-PROD] משתמש ${user.userNumber} — אירוע ${eventNumber} — ${planDefinition.name}`,
    hosts_names: `משפחת QA ${user.userNumber}`,
    honoree_display_name: `אירוע הדגמה ${user.userNumber}-${eventNumber}`,
    event_date: dateForEvent(user.userNumber, eventNumber),
    ceremony_time: '19:00:00',
    reception_time: '18:00:00',
    venue_name: `אולם בדיקה ${eventNumber}`,
    address: `רחוב בדיקת המנהל ${eventNumber}, נתניה`,
    contact_phone: `050${String(user.userNumber).padStart(2, '0')}${String(eventNumber).padStart(2, '0')}000`,
    description: `נתוני QA קבועים לבדיקת מנהל־העל. תג: ${SEED_TAG}`,
    expected_guests: planDefinition.attendeeLimit,
    is_active: false,
  };

  const { data: existing, error: readError } = await supabase
    .from('events')
    .select('id, owner_user_id, title')
    .eq('public_id', publicId)
    .maybeSingle();
  if (readError !== null) throw new Error(`Unable to read ${publicId}: ${readError.message}`);

  let eventId: string;
  if (existing === null) {
    const { data, error } = await supabase.from('events').insert(eventPayload).select('id').single();
    if (error !== null) throw new Error(`Unable to create ${publicId}: ${error.message}`);
    eventId = data.id;
  } else {
    if (existing.owner_user_id !== user.id || !existing.title.startsWith('[QA-PROD]')) {
      throw new Error(`Refusing to overwrite non-QA event ${publicId}.`);
    }
    const { error } = await supabase.from('events').update(eventPayload).eq('id', existing.id);
    if (error !== null) throw new Error(`Unable to refresh ${publicId}: ${error.message}`);
    eventId = existing.id;
  }

  const { data: existingLicense, error: licenseReadError } = await supabase
    .from('audit_logs')
    .select('id')
    .eq('entity_type', 'event_license')
    .eq('entity_id', eventId)
    .contains('metadata', { qa_seed_tag: SEED_TAG })
    .limit(1);
  if (licenseReadError !== null) {
    throw new Error(`Unable to read license for ${publicId}: ${licenseReadError.message}`);
  }

  if ((existingLicense ?? []).length === 0) {
    const paymentMethod =
      plan === 'trial' ? null : PAYMENT_METHODS[(eventNumber - 1) % PAYMENT_METHODS.length]!;
    const { error } = await supabase.from('audit_logs').insert({
      admin_user_id: platformOwnerId,
      action: 'event_license_updated',
      entity_type: 'event_license',
      entity_id: eventId,
      metadata: {
        event_id: eventId,
        plan,
        status: plan === 'trial' ? 'trial' : 'active',
        price_agorot: planDefinition.priceAgorot,
        payment_method: paymentMethod,
        payment_reference:
          paymentMethod === null
            ? null
            : `QA-PROD-${String(user.userNumber).padStart(2, '0')}-${String(eventNumber).padStart(2, '0')}`,
        notes: `נוצר עבור בדיקת מנהל־העל; ${SEED_TAG}`,
        qa_seed_tag: SEED_TAG,
      },
    });
    if (error !== null) throw new Error(`Unable to license ${publicId}: ${error.message}`);
  }

  return { id: eventId, ownerId: user.id, publicId, plan };
}

async function verifySeed(users: readonly SeedUser[], events: readonly SeedEvent[]): Promise<void> {
  if (users.length !== USER_COUNT) throw new Error(`Expected ${USER_COUNT} QA users.`);
  if (new Set(users.map((user) => user.email)).size !== USER_COUNT) {
    throw new Error('QA email addresses are not unique.');
  }
  if (events.length !== EXPECTED_EVENT_COUNT) {
    throw new Error(`Expected ${EXPECTED_EVENT_COUNT} seeded events.`);
  }

  const userIds = users.map((user) => user.id);
  const { data: storedEvents, error: eventError } = await supabase
    .from('events')
    .select('id, owner_user_id, public_id')
    .in('owner_user_id', userIds)
    .like('public_id', 'qa-prod-%');
  if (eventError !== null) throw new Error(`Unable to verify events: ${eventError.message}`);
  if ((storedEvents ?? []).length !== EXPECTED_EVENT_COUNT) {
    throw new Error(`Production contains ${(storedEvents ?? []).length} seeded events, expected 200.`);
  }

  const eventsPerOwner = new Map<string, number>();
  for (const event of storedEvents ?? []) {
    eventsPerOwner.set(event.owner_user_id, (eventsPerOwner.get(event.owner_user_id) ?? 0) + 1);
  }
  for (const user of users) {
    if (eventsPerOwner.get(user.id) !== EVENTS_PER_USER) {
      throw new Error(`${user.email} does not own exactly ${EVENTS_PER_USER} QA events.`);
    }
  }

  const { data: licenses, error: licenseError } = await supabase
    .from('audit_logs')
    .select('entity_id, metadata')
    .eq('entity_type', 'event_license')
    .contains('metadata', { qa_seed_tag: SEED_TAG });
  if (licenseError !== null) throw new Error(`Unable to verify licenses: ${licenseError.message}`);
  if ((licenses ?? []).length !== EXPECTED_EVENT_COUNT) {
    throw new Error(`Production contains ${(licenses ?? []).length} QA licenses, expected 200.`);
  }

  const planCounts = new Map<string, number>();
  for (const license of licenses ?? []) {
    const metadata = license.metadata as Record<string, unknown>;
    const plan = String(metadata['plan']);
    planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1);
  }

  const expectedPlans = { trial: 60, basic: 60, premium: 40, pro: 40 } as const;
  for (const [plan, expected] of Object.entries(expectedPlans)) {
    if (planCounts.get(plan) !== expected) {
      throw new Error(`Plan ${plan} count is ${planCounts.get(plan) ?? 0}, expected ${expected}.`);
    }
  }

  console.info('✅ Production admin demonstration data verified.');
  console.info(`✅ ${USER_COUNT} unique QA users.`);
  console.info(`✅ ${EXPECTED_EVENT_COUNT} persistent QA events and licenses.`);
  console.info('✅ Per user: 10 events — 3 Trial, 3 Basic, 2 Premium and 2 Pro.');
  console.info(`✅ Platform owner verified: ${PLATFORM_OWNER_EMAIL}.`);
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  const existingUsers = await listAllUsers();
  const platformOwner = await ensurePlatformOwner(existingUsers);
  const users = await ensureSeedUsers(existingUsers);
  const events: SeedEvent[] = [];

  for (const user of users) {
    for (let eventNumber = 1; eventNumber <= EVENTS_PER_USER; eventNumber += 1) {
      events.push(await ensureEvent(user, eventNumber, platformOwner.id));
    }
  }

  await verifySeed(users, events);
  console.info(`✅ Completed in ${Math.round(performance.now() - startedAt)}ms.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
