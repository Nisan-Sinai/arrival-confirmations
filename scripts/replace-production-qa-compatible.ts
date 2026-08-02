import { randomUUID } from 'node:crypto';

import { createClient, type User } from '@supabase/supabase-js';

import { getPlanDefinition, type PlanCode } from '../app/_lib/plans';

const PLATFORM_OWNER_EMAIL = 'nisan.sinai5@gmail.com';
const OLD_SEED_TAG = 'production-admin-demo-v1';
const NEW_SEED_TAG = 'production-realistic-qa-v3';
const SHARED_PASSWORD = ['Qa', '1234', '!'].join('');
const USER_COUNT = 20;
const EVENTS_PER_USER = 10;
const EVENT_COUNT = USER_COUNT * EVENTS_PER_USER;
const SITE_URL = 'https://arrival-confirmations.vercel.app';

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

const EVENT_TYPES = [
  'wedding',
  'bar_mitzvah',
  'bat_mitzvah',
  'brit_mila',
  'engagement',
  'birthday',
  'henna',
  'pidyon_haben',
  'upsherin',
  'other',
] as const;

const FIRST_NAMES = [
  'איתי', 'נועה', 'אורי', 'יעל', 'אליה', 'שירה', 'דניאל', 'מיכל', 'רפאל', 'אביגיל',
  'יונתן', 'תמר', 'נועם', 'הילה', 'מאיר', 'רחל', 'עידו', 'איילת', 'יהודה', 'מוריה',
  'אלעד', 'אמונה', 'משה', 'אפרת', 'נתנאל', 'הדס', 'עמית', 'ליאור', 'אברהם', 'נעמה',
];

const FAMILY_NAMES = [
  'כהן', 'לוי', 'מזרחי', 'פרץ', 'ביטון', 'דהן', 'אברהם', 'מלכה', 'אדרי', 'גבאי',
  'אזולאי', 'בן דוד', 'שלום', 'סויסה', 'עמר', 'חדד', 'בן חיים', 'אלפסי', 'שמעוני', 'וקנין',
];

const VENUES = [
  ['מרלו בוטיק', 'נתניה', 'רחוב האומנות 8'],
  ['גני השרון', 'כפר סבא', 'דרך השרון 14'],
  ['הטרמינל', 'פתח תקווה', 'רחוב התעשייה 5'],
  ['חצר המלכה', 'כנות', 'מתחם האירועים כנות'],
  ['ויה אירועים', 'נס ציונה', 'דרך המדע 3'],
  ['אולמי דוד', 'ירושלים', 'רחוב ירמיהו 25'],
  ['הגן בשפיים', 'שפיים', 'קיבוץ שפיים'],
  ['אריא', 'שוהם', 'פארק התעשייה חבל מודיעין'],
  ['לאגו', 'ראשון לציון', 'המאה ועשרים 6'],
  ['אלכסנדר', 'עמק חפר', 'דרך הנחל 1'],
  ['כינור דוד', 'בית שמש', 'נחל שורק 12'],
  ['סיטרוס', 'אבן יהודה', 'המייסדים 18'],
  ['קדם', 'בארות יצחק', 'מתחם קדם'],
  ['וואלי', 'כפר סבא', 'עתיר ידע 2'],
  ['אווניו', 'קריית שדה התעופה', 'הירדן 1'],
  ['הינומה', 'נשר', 'דרך השלום 7'],
  ['גבריאל', 'נס ציונה', 'החרש 9'],
  ['בית על הים', 'תל אביב', 'רציף העלייה השנייה 1'],
  ['אחוזת סנדרין', 'רגבה', 'מתחם רגבה'],
  ['הדריה', 'צומת ראם', 'דרך האירועים 4'],
] as const;

const PAYMENT_METHODS = ['phone', 'bit', 'bank_transfer', 'cash', 'other'] as const;
const MEALS = ['רגיל', 'צמחוני', 'טבעוני', 'ללא גלוטן'] as const;

type SeedPlan = (typeof PLAN_SEQUENCE)[number];

interface SeedUser {
  readonly id: string;
  readonly email: string;
  readonly userNumber: number;
}

interface GuestBlueprint {
  readonly number: number;
  readonly fullName: string;
  readonly phone: string;
  readonly familySide: 'side_a' | 'side_b' | 'other';
  readonly partySize: number;
  readonly attendance: 'attending' | 'not_attending' | 'maybe' | 'unanswered';
}

interface SeededEvent {
  readonly id: string;
  readonly ownerId: string;
  readonly publicId: string;
  readonly plan: SeedPlan;
  readonly guestRows: number;
  readonly rsvpRows: number;
  readonly expectedPeople: number;
}

function required(name: 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY' | 'SUPABASE_ANON_KEY'): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const supabaseUrl = required('SUPABASE_URL');
const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = required('SUPABASE_ANON_KEY');

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

function chunk<T>(items: readonly T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
}

function ownerEmail(userNumber: number): string {
  return `nisan.sinai5+qa-owner-${String(userNumber).padStart(2, '0')}@gmail.com`;
}

async function listAllUsers(): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1_000 });
    if (error) throw new Error(`Unable to list users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1_000) return users;
  }
}

function isQaUser(user: User): boolean {
  const email = user.email ?? '';
  const tag = user.user_metadata?.['qa_seed_tag'];
  return (
    tag === OLD_SEED_TAG ||
    tag === 'production-realistic-qa-v2' ||
    tag === NEW_SEED_TAG ||
    /^qa-arrival-owner-\d{2}@example\.com$/i.test(email) ||
    /^nisan\.sinai5\+qa-owner-\d{2}@gmail\.com$/i.test(email)
  );
}

async function verifyOwner(users: readonly User[]): Promise<User> {
  const owner = users.find((user) => user.email?.toLowerCase() === PLATFORM_OWNER_EMAIL);
  if (!owner) throw new Error(`Platform owner ${PLATFORM_OWNER_EMAIL} was not found.`);
  if (typeof owner.email_confirmed_at !== 'string') throw new Error('Platform owner is not confirmed.');
  return owner;
}

async function cleanup(users: readonly User[]): Promise<void> {
  const eventIds = new Set<string>();
  for (const pattern of ['qa-prod-%', 'qa-live-%']) {
    const { data, error } = await admin.from('events').select('id').like('public_id', pattern);
    if (error) throw new Error(`Unable to locate ${pattern}: ${error.message}`);
    for (const row of data ?? []) eventIds.add(row.id);
  }

  for (const ids of chunk([...eventIds], 75)) {
    const { error: logError } = await admin.from('audit_logs').delete().in('entity_id', ids);
    if (logError) throw new Error(`Unable to delete QA audit rows: ${logError.message}`);
    const { error: eventError } = await admin.from('events').delete().in('id', ids);
    if (eventError) throw new Error(`Unable to delete QA events: ${eventError.message}`);
  }

  const qaUsers = users.filter(isQaUser);
  for (const user of qaUsers) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`Unable to delete ${user.email}: ${error.message}`);
  }

  console.info(`🧹 Removed ${eventIds.size} QA events and ${qaUsers.length} QA users.`);
}

async function createUsers(): Promise<SeedUser[]> {
  const users: SeedUser[] = [];
  for (let userNumber = 1; userNumber <= USER_COUNT; userNumber += 1) {
    const email = ownerEmail(userNumber);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: SHARED_PASSWORD,
      email_confirm: true,
      user_metadata: {
        display_name: `בעל אירוע ${userNumber}`,
        qa_seed_tag: NEW_SEED_TAG,
        qa_user_number: userNumber,
      },
    });
    if (error) throw new Error(`Unable to create ${email}: ${error.message}`);
    users.push({ id: data.user.id, email, userNumber });
  }
  return users;
}

function firstName(index: number): string {
  return FIRST_NAMES[index % FIRST_NAMES.length]!;
}

function familyName(index: number): string {
  return FAMILY_NAMES[index % FAMILY_NAMES.length]!;
}

function titleFor(type: (typeof EVENT_TYPES)[number], index: number): string {
  const first = firstName(index);
  const second = firstName(index + 9);
  const family = familyName(index);
  if (type === 'wedding') return `חתונת ${first} ו${second}`;
  if (type === 'bar_mitzvah') return `בר המצווה של ${first} ${family}`;
  if (type === 'bat_mitzvah') return `בת המצווה של ${first} ${family}`;
  if (type === 'brit_mila') return `ברית המילה של ${first} ${family}`;
  if (type === 'engagement') return `אירוסי ${first} ו${second}`;
  if (type === 'birthday') return `יום הולדת חגיגי ל${first}`;
  if (type === 'henna') return `החינה של ${first} ו${second}`;
  if (type === 'pidyon_haben') return `פדיון הבן למשפחת ${family}`;
  if (type === 'upsherin') return `חלאקה ל${first} ${family}`;
  return `ערב משפחתי של משפחת ${family}`;
}

function dateFor(index: number): string {
  return new Date(Date.UTC(2026, 7, 10 + index)).toISOString().slice(0, 10);
}

function guestsFor(globalIndex: number): GuestBlueprint[] {
  const guestRows = 10 + (globalIndex % 16);
  return Array.from({ length: guestRows }, (_, offset) => {
    const number = offset + 1;
    const partySize = 1 + ((globalIndex + number) % 4);
    const cycle = (globalIndex + number) % 10;
    const attendance =
      cycle < 6 ? 'attending' : cycle === 6 ? 'maybe' : cycle === 7 ? 'not_attending' : 'unanswered';
    const nameIndex = globalIndex * 3 + number;
    return {
      number,
      fullName: `${firstName(nameIndex)} ${familyName(nameIndex + globalIndex)}`,
      phone: `+97250${String(globalIndex * 100 + number).padStart(7, '0')}`,
      familySide: number % 3 === 0 ? 'other' : number % 2 === 0 ? 'side_b' : 'side_a',
      partySize,
      attendance,
    };
  });
}

async function createEvent(user: SeedUser, eventNumber: number, adminId: string): Promise<SeededEvent> {
  const globalIndex = (user.userNumber - 1) * EVENTS_PER_USER + eventNumber;
  const plan = PLAN_SEQUENCE[eventNumber - 1]!;
  const planDefinition = getPlanDefinition(plan);
  if (!planDefinition) throw new Error(`Missing plan definition for ${plan}.`);

  const type = EVENT_TYPES[(globalIndex - 1) % EVENT_TYPES.length]!;
  const venue = VENUES[(globalIndex - 1) % VENUES.length]!;
  const publicId = `qa-live-u${String(user.userNumber).padStart(2, '0')}-e${String(eventNumber).padStart(2, '0')}`;
  const guests = guestsFor(globalIndex);
  const expectedPeople = guests.reduce((total, guest) => total + guest.partySize, 0);
  const address = `${venue[2]}, ${venue[1]}`;

  const { data: event, error: eventError } = await admin
    .from('events')
    .insert({
      owner_user_id: user.id,
      public_id: publicId,
      event_type: type,
      title: titleFor(type, globalIndex),
      hosts_names: `משפחת ${familyName(globalIndex)}`,
      honoree_display_name: firstName(globalIndex),
      event_date: dateFor(globalIndex),
      ceremony_time: eventNumber % 2 === 0 ? '19:30:00' : '20:00:00',
      reception_time: eventNumber % 2 === 0 ? '18:30:00' : '19:00:00',
      venue_name: venue[0],
      address,
      waze_url: `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`,
      google_maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      contact_phone: `050${String(7_000_000 + globalIndex).padStart(7, '0')}`,
      description: `אירוע QA פעיל ומציאותי לבדיקת Production. ${NEW_SEED_TAG}. תרחיש ${globalIndex}.`,
      side_a_label: eventNumber % 2 === 0 ? 'משפחת החתן' : 'צד א',
      side_b_label: eventNumber % 2 === 0 ? 'משפחת הכלה' : 'צד ב',
      expected_guests: expectedPeople,
      is_active: true,
    })
    .select('id')
    .single();
  if (eventError) throw new Error(`Unable to create ${publicId}: ${eventError.message}`);

  const paymentMethod = plan === 'trial' ? null : PAYMENT_METHODS[(eventNumber - 1) % PAYMENT_METHODS.length]!;
  const { error: licenseError } = await admin.from('audit_logs').insert({
    admin_user_id: adminId,
    action: 'event_license_updated',
    entity_type: 'event_license',
    entity_id: event.id,
    metadata: {
      event_id: event.id,
      plan,
      status: plan === 'trial' ? 'trial' : 'active',
      price_agorot: planDefinition.priceAgorot,
      payment_method: paymentMethod,
      payment_reference: paymentMethod ? `QA-${user.userNumber}-${eventNumber}` : null,
      notes: `מנוי QA Production; ${NEW_SEED_TAG}`,
      qa_seed_tag: NEW_SEED_TAG,
    },
  });
  if (licenseError) throw new Error(`Unable to license ${publicId}: ${licenseError.message}`);

  const guestPayloads = guests.map((guest) => ({
    event_id: event.id,
    full_name: guest.fullName,
    phone: guest.phone,
    phone_normalized: guest.phone,
    family_side: guest.familySide,
    invite_token_hash: `qa-live-invite-${globalIndex}-${guest.number}-${randomUUID()}`,
    token_expires_at: '2027-12-31T23:59:59.000Z',
    is_active: true,
  }));
  const { data: storedGuests, error: guestError } = await admin
    .from('guests')
    .insert(guestPayloads)
    .select('id, full_name, phone, family_side');
  if (guestError) throw new Error(`Unable to create guests for ${publicId}: ${guestError.message}`);

  const byPhone = new Map(guests.map((guest) => [guest.phone, guest]));
  const rsvps = (storedGuests ?? []).flatMap((guest) => {
    const blueprint = byPhone.get(guest.phone);
    if (!blueprint || blueprint.attendance === 'unanswered') return [];
    const attendingPeople = blueprint.attendance === 'not_attending' ? 0 : blueprint.partySize;
    const children = attendingPeople >= 3 && blueprint.number % 2 === 0 ? 1 : 0;
    const babies = attendingPeople >= 4 && blueprint.number % 5 === 0 ? 1 : 0;
    const adults = Math.max(0, attendingPeople - children - babies);
    return [{
      event_id: event.id,
      guest_id: guest.id,
      full_name: guest.full_name,
      phone: guest.phone,
      phone_normalized: guest.phone,
      family_side: guest.family_side,
      attendance_status: blueprint.attendance,
      adults_count: adults,
      children_count: children,
      babies_count: babies,
      dietary_requirements: MEALS[(globalIndex + blueprint.number) % MEALS.length],
      notes: blueprint.attendance === 'maybe' ? 'ממתינים לאישור סופי' : 'נוצר בבדיקת QA מציאותית',
      consent: true,
      source: blueprint.number % 2 === 0 ? 'public_form' : 'personal_link',
      update_token_hash: `qa-live-update-${globalIndex}-${blueprint.number}-${randomUUID()}`,
      update_token_expires_at: '2027-12-31T23:59:59.000Z',
    }];
  });

  if (rsvps.length > 0) {
    const { error: rsvpError } = await admin.from('rsvps').insert(rsvps);
    if (rsvpError) throw new Error(`Unable to create RSVPs for ${publicId}: ${rsvpError.message}`);
  }

  return {
    id: event.id,
    ownerId: user.id,
    publicId,
    plan,
    guestRows: guests.length,
    rsvpRows: rsvps.length,
    expectedPeople,
  };
}

async function createEvents(users: readonly SeedUser[], adminId: string): Promise<SeededEvent[]> {
  const tasks = users.flatMap((user) =>
    Array.from({ length: EVENTS_PER_USER }, (_, index) => ({ user, eventNumber: index + 1 })),
  );
  const events: SeededEvent[] = [];
  for (const batch of chunk(tasks, 5)) {
    events.push(...(await Promise.all(batch.map((task) => createEvent(task.user, task.eventNumber, adminId)))));
    console.info(`📦 Created ${events.length}/${EVENT_COUNT} events.`);
  }
  return events;
}

async function verifyLogins(users: readonly SeedUser[]): Promise<void> {
  for (const user of users) {
    const client = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
    const { data, error: signInError } = await client.auth.signInWithPassword({
      email: user.email,
      password: SHARED_PASSWORD,
    });
    if (signInError || !data.user) throw new Error(`Login failed for ${user.email}: ${signInError?.message}`);

    const { data: events, count, error } = await client
      .from('events')
      .select('id, owner_user_id, public_id', { count: 'exact' })
      .like('public_id', 'qa-live-%');
    if (error) throw new Error(`RLS query failed for ${user.email}: ${error.message}`);
    if (count !== EVENTS_PER_USER || (events ?? []).length !== EVENTS_PER_USER) {
      throw new Error(`${user.email} sees ${count ?? 0} events instead of 10.`);
    }
    if ((events ?? []).some((event) => event.owner_user_id !== user.id)) {
      throw new Error(`${user.email} can see another user's event.`);
    }
    await client.auth.signOut();
  }
}

async function verifyPublicPages(events: readonly SeededEvent[]): Promise<void> {
  for (const event of events.filter((_, index) => index % 20 === 0)) {
    let ok = false;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const response = await fetch(`${SITE_URL}/e/${event.publicId}`, { redirect: 'follow' });
      if (response.ok) {
        const html = await response.text();
        if (html.includes('אישור הגעה') || html.includes(event.publicId)) {
          ok = true;
          break;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_500));
    }
    if (!ok) throw new Error(`Public page failed for ${event.publicId}.`);
  }
}

async function verifyData(users: readonly SeedUser[], events: readonly SeededEvent[]): Promise<void> {
  if (users.length !== USER_COUNT || new Set(users.map((user) => user.email)).size !== USER_COUNT) {
    throw new Error('Expected 20 unique owner accounts.');
  }
  if (events.length !== EVENT_COUNT) throw new Error('Expected 200 events.');

  const eventIds = events.map((event) => event.id);
  const ownerIds = users.map((user) => user.id);
  const expectedGuests = events.reduce((total, event) => total + event.guestRows, 0);
  const expectedRsvps = events.reduce((total, event) => total + event.rsvpRows, 0);

  const { data: storedEvents, count, error } = await admin
    .from('events')
    .select('id, owner_user_id, public_id, is_active', { count: 'exact' })
    .in('owner_user_id', ownerIds)
    .like('public_id', 'qa-live-%');
  if (error) throw new Error(`Unable to verify events: ${error.message}`);
  if (count !== EVENT_COUNT || (storedEvents ?? []).length !== EVENT_COUNT) {
    throw new Error(`Found ${count ?? 0} events instead of 200.`);
  }
  if ((storedEvents ?? []).some((event) => !event.is_active)) throw new Error('At least one event is not active.');

  const perOwner = new Map<string, number>();
  for (const event of storedEvents ?? []) perOwner.set(event.owner_user_id, (perOwner.get(event.owner_user_id) ?? 0) + 1);
  for (const user of users) if (perOwner.get(user.id) !== 10) throw new Error(`${user.email} does not own 10 events.`);

  const countRows = async (table: 'guests' | 'rsvps'): Promise<number> => {
    const { count: rowCount, error: countError } = await admin
      .from(table)
      .select('id', { count: 'exact', head: true })
      .in('event_id', eventIds);
    if (countError) throw new Error(`Unable to count ${table}: ${countError.message}`);
    return rowCount ?? 0;
  };

  const [guestCount, rsvpCount] = await Promise.all([countRows('guests'), countRows('rsvps')]);
  if (guestCount !== expectedGuests) throw new Error(`Guest count ${guestCount} != ${expectedGuests}.`);
  if (rsvpCount !== expectedRsvps) throw new Error(`RSVP count ${rsvpCount} != ${expectedRsvps}.`);

  const { data: licenses, error: licenseError } = await admin
    .from('audit_logs')
    .select('entity_id, metadata')
    .eq('entity_type', 'event_license')
    .contains('metadata', { qa_seed_tag: NEW_SEED_TAG });
  if (licenseError) throw new Error(`Unable to verify licenses: ${licenseError.message}`);
  if ((licenses ?? []).length !== EVENT_COUNT) throw new Error('Expected 200 event licenses.');

  const planCounts = new Map<string, number>();
  for (const license of licenses ?? []) {
    const metadata = license.metadata as Record<string, unknown>;
    const plan = String(metadata['plan']);
    planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1);
  }
  const expectedPlans = { trial: 60, basic: 60, premium: 40, pro: 40 } as const;
  for (const [plan, expected] of Object.entries(expectedPlans)) {
    if (planCounts.get(plan) !== expected) throw new Error(`Incorrect ${plan} count.`);
  }

  console.info(`✅ ${USER_COUNT} unique Gmail-alias owners.`);
  console.info(`✅ ${EVENT_COUNT} active and distinct events.`);
  console.info(`✅ ${guestCount} guest records and ${rsvpCount} RSVP records.`);
  console.info('✅ Each owner has 10 events and can see only those events through RLS.');
  console.info('✅ Plans: 60 Trial, 60 Basic, 40 Premium and 40 Pro.');
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  const existingUsers = await listAllUsers();
  const platformOwner = await verifyOwner(existingUsers);

  await cleanup(existingUsers);
  const users = await createUsers();
  const events = await createEvents(users, platformOwner.id);
  await verifyData(users, events);
  await verifyLogins(users);
  await verifyPublicPages(events);

  console.info(`✅ Platform owner verified: ${PLATFORM_OWNER_EMAIL}.`);
  console.info(`✅ Shared temporary password configured for all owners.`);
  console.info(`✅ Completed in ${Math.round(performance.now() - startedAt)}ms.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
