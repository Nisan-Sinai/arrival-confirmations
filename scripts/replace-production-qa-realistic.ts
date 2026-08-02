import { randomUUID } from 'node:crypto';

import { createClient, type User } from '@supabase/supabase-js';

import { getPlanDefinition, type PlanCode } from '../app/_lib/plans';

const PLATFORM_OWNER_EMAIL = 'nisan.sinai5@gmail.com';
const OLD_SEED_TAG = 'production-admin-demo-v1';
const NEW_SEED_TAG = 'production-realistic-qa-v2';
const SHARED_PASSWORD = ['Qa', '1234', '!'].join('');
const USER_COUNT = 20;
const EVENTS_PER_USER = 10;
const EVENT_COUNT = USER_COUNT * EVENTS_PER_USER;
const PRODUCTION_SITE_URL = 'https://arrival-confirmations.vercel.app';

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
  'איתי',
  'נועה',
  'אורי',
  'יעל',
  'אליה',
  'שירה',
  'דניאל',
  'מיכל',
  'רפאל',
  'אביגיל',
  'יונתן',
  'תמר',
  'נועם',
  'הילה',
  'מאיר',
  'רחל',
  'עידו',
  'איילת',
  'יהודה',
  'מוריה',
  'אלעד',
  'אמונה',
  'משה',
  'אפרת',
  'נתנאל',
  'הדס',
  'עמית',
  'ליאור',
  'אברהם',
  'נעמה',
];

const FAMILY_NAMES = [
  'כהן',
  'לוי',
  'מזרחי',
  'פרץ',
  'ביטון',
  'דהן',
  'אברהם',
  'מלכה',
  'אדרי',
  'גבאי',
  'אזולאי',
  'בן דוד',
  'שלום',
  'סויסה',
  'עמר',
  'חדד',
  'בן חיים',
  'אלפסי',
  'שמעוני',
  'וקנין',
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

const PRIMARY_COLORS = [
  '#7c2d12',
  '#1e3a8a',
  '#14532d',
  '#581c87',
  '#831843',
  '#164e63',
  '#713f12',
  '#312e81',
  '#3f6212',
  '#7f1d1d',
];

const ACCENT_COLORS = [
  '#f59e0b',
  '#60a5fa',
  '#4ade80',
  '#c084fc',
  '#f472b6',
  '#22d3ee',
  '#facc15',
  '#818cf8',
  '#a3e635',
  '#fb7185',
];

const MEALS = ['רגיל', 'צמחוני', 'טבעוני', 'ללא גלוטן'] as const;
const IMPORT_SOURCES = ['manual', 'csv', 'xlsx'] as const;
const PAYMENT_METHODS = ['phone', 'bit', 'bank_transfer', 'cash', 'other'] as const;

type SeedPlan = (typeof PLAN_SEQUENCE)[number];

interface SeedUser {
  readonly id: string;
  readonly email: string;
  readonly userNumber: number;
}

interface PartyBlueprint {
  readonly partyNumber: number;
  readonly partySize: number;
  readonly tableIndex: number;
  readonly seatStart: number;
  readonly fullName: string;
  readonly phone: string;
  readonly familySide: 'side_a' | 'side_b' | 'other';
  readonly status: 'attending' | 'not_attending' | 'maybe' | 'unanswered';
}

interface SeededEvent {
  readonly id: string;
  readonly ownerId: string;
  readonly publicId: string;
  readonly plan: SeedPlan;
  readonly partyCount: number;
  readonly rsvpCount: number;
  readonly tableCount: number;
  readonly expectedPeople: number;
}

function requiredEnvironment(
  name: 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY' | 'SUPABASE_ANON_KEY',
): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value === '') throw new Error(`${name} is required`);
  return value;
}

const supabaseUrl = requiredEnvironment('SUPABASE_URL');
const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = requiredEnvironment('SUPABASE_ANON_KEY');

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

function ownerEmail(userNumber: number): string {
  return `nisan.sinai5+qa-owner-${String(userNumber).padStart(2, '0')}@gmail.com`;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

async function listAllUsers(): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1_000 });
    if (error !== null) throw new Error(`Unable to list users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1_000) return users;
  }
}

function isOldSeedUser(user: User): boolean {
  return (
    user.user_metadata?.['qa_seed_tag'] === OLD_SEED_TAG ||
    /^qa-arrival-owner-\d{2}@example\.com$/i.test(user.email ?? '')
  );
}

function isNewSeedUser(user: User): boolean {
  return (
    user.user_metadata?.['qa_seed_tag'] === NEW_SEED_TAG ||
    /^nisan\.sinai5\+qa-owner-\d{2}@gmail\.com$/i.test(user.email ?? '')
  );
}

async function verifyPlatformOwner(users: readonly User[]): Promise<User> {
  const owner = users.find((user) => user.email?.toLowerCase() === PLATFORM_OWNER_EMAIL);
  if (owner === undefined) throw new Error(`Platform owner ${PLATFORM_OWNER_EMAIL} was not found.`);
  if (typeof owner.email_confirmed_at !== 'string') {
    throw new Error(`Platform owner ${PLATFORM_OWNER_EMAIL} is not email-confirmed.`);
  }
  return owner;
}

async function deleteSeedEvents(): Promise<number> {
  const eventMap = new Map<string, { id: string }>();
  for (const pattern of ['qa-prod-%', 'qa-live-%']) {
    const { data, error } = await admin.from('events').select('id').like('public_id', pattern);
    if (error !== null) throw new Error(`Unable to find ${pattern} events: ${error.message}`);
    for (const event of data ?? []) eventMap.set(event.id, event);
  }

  const eventIds = [...eventMap.keys()];
  for (const ids of chunk(eventIds, 75)) {
    const { error: logError } = await admin.from('audit_logs').delete().in('entity_id', ids);
    if (logError !== null) throw new Error(`Unable to delete QA audit logs: ${logError.message}`);

    const { error: eventError } = await admin.from('events').delete().in('id', ids);
    if (eventError !== null) throw new Error(`Unable to delete QA events: ${eventError.message}`);
  }
  return eventIds.length;
}

async function deleteSeedUsers(users: readonly User[]): Promise<number> {
  const qaUsers = users.filter((user) => isOldSeedUser(user) || isNewSeedUser(user));
  for (const user of qaUsers) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error !== null) throw new Error(`Unable to delete QA user ${user.email}: ${error.message}`);
  }
  return qaUsers.length;
}

async function cleanupOldData(existingUsers: readonly User[]): Promise<void> {
  const deletedEvents = await deleteSeedEvents();
  const deletedUsers = await deleteSeedUsers(existingUsers);
  console.info(`🧹 Deleted ${deletedEvents} previous QA events and ${deletedUsers} QA users.`);
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
    if (error !== null) throw new Error(`Unable to create ${email}: ${error.message}`);
    users.push({ id: data.user.id, email, userNumber });
  }
  return users;
}

function nameAt(index: number): string {
  return FIRST_NAMES[index % FIRST_NAMES.length]!;
}

function familyAt(index: number): string {
  return FAMILY_NAMES[index % FAMILY_NAMES.length]!;
}

function eventTitle(eventType: (typeof EVENT_TYPES)[number], globalIndex: number): string {
  const first = nameAt(globalIndex);
  const second = nameAt(globalIndex + 9);
  const family = familyAt(globalIndex);
  if (eventType === 'wedding') return `חתונת ${first} ו${second}`;
  if (eventType === 'bar_mitzvah') return `בר המצווה של ${first} ${family}`;
  if (eventType === 'bat_mitzvah') return `בת המצווה של ${first} ${family}`;
  if (eventType === 'brit_mila') return `ברית המילה של ${first} ${family}`;
  if (eventType === 'engagement') return `אירוסי ${first} ו${second}`;
  if (eventType === 'birthday') return `יום הולדת חגיגי ל${first}`;
  if (eventType === 'henna') return `החינה של ${first} ו${second}`;
  if (eventType === 'pidyon_haben') return `פדיון הבן למשפחת ${family}`;
  if (eventType === 'upsherin') return `חלאקה ל${first} ${family}`;
  return `ערב משפחתי של משפחת ${family}`;
}

function eventDate(globalIndex: number): string {
  const date = new Date(Date.UTC(2026, 7, 10 + globalIndex));
  return date.toISOString().slice(0, 10);
}

function buildParties(globalIndex: number, partyCount: number): PartyBlueprint[] {
  const parties: PartyBlueprint[] = [];
  let tableIndex = 0;
  let occupied = 0;

  for (let partyNumber = 1; partyNumber <= partyCount; partyNumber += 1) {
    const partySize = 1 + ((globalIndex + partyNumber) % 4);
    if (occupied + partySize > 10) {
      tableIndex += 1;
      occupied = 0;
    }
    const seatStart = occupied + 1;
    occupied += partySize;

    const nameIndex = globalIndex * 3 + partyNumber;
    const statusCycle = (globalIndex + partyNumber) % 10;
    const status =
      statusCycle < 6
        ? 'attending'
        : statusCycle === 6
          ? 'maybe'
          : statusCycle === 7
            ? 'not_attending'
            : 'unanswered';

    parties.push({
      partyNumber,
      partySize,
      tableIndex,
      seatStart,
      fullName: `${nameAt(nameIndex)} ${familyAt(nameIndex + globalIndex)}`,
      phone: `+97250${String(globalIndex * 100 + partyNumber).padStart(7, '0')}`,
      familySide:
        partyNumber % 3 === 0 ? 'other' : partyNumber % 2 === 0 ? 'side_b' : 'side_a',
      status,
    });
  }

  return parties;
}

async function createEvent(
  user: SeedUser,
  eventNumber: number,
  platformOwnerId: string,
): Promise<SeededEvent> {
  const globalIndex = (user.userNumber - 1) * EVENTS_PER_USER + eventNumber;
  const plan = PLAN_SEQUENCE[eventNumber - 1]!;
  const planDefinition = getPlanDefinition(plan);
  if (planDefinition === null) throw new Error(`Missing plan definition for ${plan}.`);

  const type = EVENT_TYPES[(globalIndex - 1) % EVENT_TYPES.length]!;
  const venue = VENUES[(globalIndex - 1) % VENUES.length]!;
  const publicId = `qa-live-u${String(user.userNumber).padStart(2, '0')}-e${String(eventNumber).padStart(2, '0')}`;
  const partyCount = 10 + (globalIndex % 16);
  const parties = buildParties(globalIndex, partyCount);
  const expectedPeople = parties.reduce((total, party) => total + party.partySize, 0);
  const tableCount = Math.max(...parties.map((party) => party.tableIndex)) + 1;
  const title = eventTitle(type, globalIndex);
  const fullAddress = `${venue[2]}, ${venue[1]}`;

  const { data: event, error: eventError } = await admin
    .from('events')
    .insert({
      owner_user_id: user.id,
      public_id: publicId,
      event_type: type,
      title,
      hosts_names: `משפחת ${familyAt(globalIndex)}`,
      honoree_display_name: nameAt(globalIndex),
      event_date: eventDate(globalIndex),
      ceremony_time: eventNumber % 2 === 0 ? '19:30:00' : '20:00:00',
      reception_time: eventNumber % 2 === 0 ? '18:30:00' : '19:00:00',
      venue_name: venue[0],
      address: fullAddress,
      waze_url: `https://www.waze.com/ul?q=${encodeURIComponent(fullAddress)}&navigate=yes`,
      google_maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
      contact_phone: `050${String(7_000_000 + globalIndex).padStart(7, '0')}`,
      description: `אירוע QA פעיל ומלא לבדיקת Production. ${NEW_SEED_TAG}. מספר תרחיש ${globalIndex}.`,
      side_a_label: eventNumber % 2 === 0 ? 'משפחת החתן' : 'צד א',
      side_b_label: eventNumber % 2 === 0 ? 'משפחת הכלה' : 'צד ב',
      expected_guests: expectedPeople,
      is_active: true,
      brand_primary_color: PRIMARY_COLORS[(globalIndex - 1) % PRIMARY_COLORS.length],
      brand_accent_color: ACCENT_COLORS[(globalIndex - 1) % ACCENT_COLORS.length],
      invitation_style:
        globalIndex % 3 === 0 ? 'minimal' : globalIndex % 2 === 0 ? 'modern' : 'classic',
    })
    .select('id')
    .single();
  if (eventError !== null) throw new Error(`Unable to create ${publicId}: ${eventError.message}`);

  const paymentMethod =
    plan === 'trial' ? null : PAYMENT_METHODS[(eventNumber - 1) % PAYMENT_METHODS.length]!;
  const { error: licenseError } = await admin.from('audit_logs').insert({
    admin_user_id: platformOwnerId,
    action: 'event_license_updated',
    entity_type: 'event_license',
    entity_id: event.id,
    metadata: {
      event_id: event.id,
      plan,
      status: plan === 'trial' ? 'trial' : 'active',
      price_agorot: planDefinition.priceAgorot,
      payment_method: paymentMethod,
      payment_reference:
        paymentMethod === null
          ? null
          : `QA-LIVE-${String(user.userNumber).padStart(2, '0')}-${String(eventNumber).padStart(2, '0')}`,
      notes: `מנוי QA Production מציאותי; ${NEW_SEED_TAG}`,
      qa_seed_tag: NEW_SEED_TAG,
    },
  });
  if (licenseError !== null) throw new Error(`Unable to license ${publicId}: ${licenseError.message}`);

  const tablePayloads = Array.from({ length: tableCount }, (_, tableIndex) => ({
    event_id: event.id,
    name: `שולחן ${tableIndex + 1}`,
    shape: ['round', 'rectangle', 'square', 'banquet'][tableIndex % 4],
    capacity: 10,
    zone: tableIndex === 0 ? 'משפחה קרובה' : tableIndex % 2 === 0 ? 'מרכז' : 'צד האולם',
    notes: tableIndex === 0 ? 'שולחן שמור למשפחה הקרובה' : null,
    sort_order: tableIndex + 1,
  }));
  const { data: tables, error: tableError } = await admin
    .from('event_seating_tables')
    .insert(tablePayloads)
    .select('id, sort_order');
  if (tableError !== null) throw new Error(`Unable to create tables for ${publicId}: ${tableError.message}`);
  const sortedTables = [...(tables ?? [])].sort((left, right) => left.sort_order - right.sort_order);
  if (sortedTables.length !== tableCount) throw new Error(`Incorrect table count for ${publicId}.`);

  const guestPayloads = parties.map((party) => {
    const table = sortedTables[party.tableIndex]!;
    return {
      event_id: event.id,
      full_name: party.fullName,
      phone: party.phone,
      phone_normalized: party.phone,
      family_side: party.familySide,
      invite_token_hash: `qa-live-invite-${globalIndex}-${party.partyNumber}-${randomUUID()}`,
      token_expires_at: '2027-12-31T23:59:59.000Z',
      is_active: true,
      email: `qa.guest.${globalIndex}.${party.partyNumber}@example.com`,
      party_size: party.partySize,
      table_id: table.id,
      table_name: `שולחן ${party.tableIndex + 1}`,
      seat_number:
        party.partySize === 1
          ? String(party.seatStart)
          : `${party.seatStart}-${party.seatStart + party.partySize - 1}`,
      seating_group: `משפחת ${familyAt(globalIndex + party.partyNumber)}`,
      meal_preference: MEALS[(globalIndex + party.partyNumber) % MEALS.length],
      accessibility_needs:
        party.partyNumber % 13 === 0
          ? 'גישה נוחה לכיסא גלגלים'
          : party.partyNumber % 11 === 0
            ? 'מקום קרוב ליציאה'
            : null,
      seating_priority: party.partyNumber % 9,
      seat_locked: party.tableIndex === 0 && party.partyNumber <= 3,
      import_source: IMPORT_SOURCES[(party.partyNumber - 1) % IMPORT_SOURCES.length],
      notes: `קבוצה של ${party.partySize} מוזמנים; תרחיש ${globalIndex}-${party.partyNumber}`,
    };
  });

  const { data: guests, error: guestError } = await admin
    .from('guests')
    .insert(guestPayloads)
    .select('id, phone, full_name, family_side, party_size, meal_preference');
  if (guestError !== null) throw new Error(`Unable to create guests for ${publicId}: ${guestError.message}`);

  const partyByPhone = new Map(parties.map((party) => [party.phone, party]));
  const rsvpPayloads = (guests ?? []).flatMap((guest) => {
    const party = partyByPhone.get(guest.phone);
    if (party === undefined || party.status === 'unanswered') return [];
    const attendingPeople = party.status === 'not_attending' ? 0 : party.partySize;
    const children = attendingPeople >= 3 && party.partyNumber % 2 === 0 ? 1 : 0;
    const babies = attendingPeople >= 4 && party.partyNumber % 5 === 0 ? 1 : 0;
    const adults = Math.max(0, attendingPeople - children - babies);

    return [
      {
        event_id: event.id,
        guest_id: guest.id,
        full_name: guest.full_name,
        phone: guest.phone,
        phone_normalized: guest.phone,
        family_side: guest.family_side,
        attendance_status: party.status,
        adults_count: adults,
        children_count: children,
        babies_count: babies,
        dietary_requirements: guest.meal_preference,
        notes:
          party.status === 'maybe'
            ? 'ממתינים לאישור סופי'
            : party.status === 'not_attending'
              ? 'לא יוכלו להגיע'
              : 'אישור הגעה התקבל',
        consent: true,
        source: party.partyNumber % 2 === 0 ? 'public_form' : 'personal_link',
        update_token_hash: `qa-live-update-${globalIndex}-${party.partyNumber}-${randomUUID()}`,
        update_token_expires_at: '2027-12-31T23:59:59.000Z',
      },
    ];
  });

  if (rsvpPayloads.length > 0) {
    const { error: rsvpError } = await admin.from('rsvps').insert(rsvpPayloads);
    if (rsvpError !== null) throw new Error(`Unable to create RSVPs for ${publicId}: ${rsvpError.message}`);
  }

  const { error: snapshotError } = await admin.from('event_seating_snapshots').insert({
    event_id: event.id,
    label: 'סידור הושבה ראשוני',
    layout: { tables: tableCount, parties: partyCount, expectedPeople },
    created_by: user.id,
  });
  if (snapshotError !== null) {
    throw new Error(`Unable to create seating snapshot for ${publicId}: ${snapshotError.message}`);
  }

  return {
    id: event.id,
    ownerId: user.id,
    publicId,
    plan,
    partyCount,
    rsvpCount: rsvpPayloads.length,
    tableCount,
    expectedPeople,
  };
}

async function createEvents(users: readonly SeedUser[], platformOwnerId: string): Promise<SeededEvent[]> {
  const tasks = users.flatMap((user) =>
    Array.from({ length: EVENTS_PER_USER }, (_, index) => ({ user, eventNumber: index + 1 })),
  );
  const results: SeededEvent[] = [];

  for (const batch of chunk(tasks, 5)) {
    const created = await Promise.all(
      batch.map(({ user, eventNumber }) => createEvent(user, eventNumber, platformOwnerId)),
    );
    results.push(...created);
    console.info(`📦 Created ${results.length}/${EVENT_COUNT} realistic events.`);
  }

  return results;
}

async function verifyLoginAndIsolation(users: readonly SeedUser[]): Promise<void> {
  for (const user of users) {
    const client = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
    const { data: signIn, error: signInError } = await client.auth.signInWithPassword({
      email: user.email,
      password: SHARED_PASSWORD,
    });
    if (signInError !== null || signIn.user === null) {
      throw new Error(`Password login failed for ${user.email}: ${signInError?.message ?? 'no user'}`);
    }

    const { data: events, count, error } = await client
      .from('events')
      .select('id, owner_user_id, public_id', { count: 'exact' })
      .like('public_id', 'qa-live-%');
    if (error !== null) throw new Error(`RLS read failed for ${user.email}: ${error.message}`);
    if (count !== EVENTS_PER_USER || (events ?? []).length !== EVENTS_PER_USER) {
      throw new Error(`${user.email} sees ${count ?? 0} QA events instead of 10.`);
    }
    if ((events ?? []).some((event) => event.owner_user_id !== user.id)) {
      throw new Error(`${user.email} can see another owner's event.`);
    }
    await client.auth.signOut();
  }
}

async function verifyPublicPages(events: readonly SeededEvent[]): Promise<void> {
  const samples = events.filter((_, index) => index % 20 === 0);
  for (const event of samples) {
    let successful = false;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const response = await fetch(`${PRODUCTION_SITE_URL}/e/${event.publicId}`, {
        redirect: 'follow',
      });
      if (response.ok) {
        const html = await response.text();
        if (html.includes(event.publicId) || html.includes('אישור הגעה')) {
          successful = true;
          break;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_500));
    }
    if (!successful) throw new Error(`Public event page failed for ${event.publicId}.`);
  }
}

async function verifyDatabase(users: readonly SeedUser[], events: readonly SeededEvent[]): Promise<void> {
  if (users.length !== USER_COUNT || new Set(users.map((user) => user.email)).size !== USER_COUNT) {
    throw new Error('Expected exactly 20 unique QA owners.');
  }
  if (events.length !== EVENT_COUNT) throw new Error('Expected exactly 200 realistic events.');

  const eventIds = events.map((event) => event.id);
  const ownerIds = users.map((user) => user.id);
  const expectedGuests = events.reduce((total, event) => total + event.partyCount, 0);
  const expectedRsvps = events.reduce((total, event) => total + event.rsvpCount, 0);
  const expectedTables = events.reduce((total, event) => total + event.tableCount, 0);

  const { data: storedEvents, count: storedEventCount, error: storedEventError } = await admin
    .from('events')
    .select('id, owner_user_id, public_id, is_active, expected_guests', { count: 'exact' })
    .in('owner_user_id', ownerIds)
    .like('public_id', 'qa-live-%');
  if (storedEventError !== null) throw new Error(`Unable to verify events: ${storedEventError.message}`);
  if (storedEventCount !== EVENT_COUNT || (storedEvents ?? []).length !== EVENT_COUNT) {
    throw new Error(`Production has ${storedEventCount ?? 0} realistic events instead of 200.`);
  }
  if ((storedEvents ?? []).some((event) => !event.is_active)) {
    throw new Error('At least one realistic event is not active.');
  }

  const eventsPerOwner = new Map<string, number>();
  for (const event of storedEvents ?? []) {
    eventsPerOwner.set(event.owner_user_id, (eventsPerOwner.get(event.owner_user_id) ?? 0) + 1);
  }
  for (const user of users) {
    if (eventsPerOwner.get(user.id) !== EVENTS_PER_USER) {
      throw new Error(`${user.email} does not own exactly 10 events.`);
    }
  }

  const countRows = async (table: 'guests' | 'rsvps' | 'event_seating_tables'): Promise<number> => {
    const { count, error } = await admin
      .from(table)
      .select('id', { count: 'exact', head: true })
      .in('event_id', eventIds);
    if (error !== null) throw new Error(`Unable to count ${table}: ${error.message}`);
    return count ?? 0;
  };

  const [guestCount, rsvpCount, tableCount] = await Promise.all([
    countRows('guests'),
    countRows('rsvps'),
    countRows('event_seating_tables'),
  ]);
  if (guestCount !== expectedGuests) throw new Error(`Guest count ${guestCount} != ${expectedGuests}.`);
  if (rsvpCount !== expectedRsvps) throw new Error(`RSVP count ${rsvpCount} != ${expectedRsvps}.`);
  if (tableCount !== expectedTables) throw new Error(`Table count ${tableCount} != ${expectedTables}.`);

  const { data: licenses, error: licenseError } = await admin
    .from('audit_logs')
    .select('entity_id, metadata')
    .eq('entity_type', 'event_license')
    .contains('metadata', { qa_seed_tag: NEW_SEED_TAG });
  if (licenseError !== null) throw new Error(`Unable to verify licenses: ${licenseError.message}`);
  if ((licenses ?? []).length !== EVENT_COUNT) throw new Error('Expected exactly 200 QA licenses.');

  const planCounts = new Map<string, number>();
  for (const license of licenses ?? []) {
    const metadata = license.metadata as Record<string, unknown>;
    const plan = String(metadata['plan']);
    planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1);
  }
  const expectedPlans = { trial: 60, basic: 60, premium: 40, pro: 40 } as const;
  for (const [plan, count] of Object.entries(expectedPlans)) {
    if (planCounts.get(plan) !== count) throw new Error(`Plan ${plan} count is incorrect.`);
  }

  console.info(`✅ ${USER_COUNT} confirmed Gmail-alias owner accounts.`);
  console.info(`✅ ${EVENT_COUNT} active, distinct Production events.`);
  console.info(`✅ ${guestCount} guest parties, ${rsvpCount} RSVPs and ${tableCount} seating tables.`);
  console.info('✅ Every owner can sign in and sees exactly their own 10 events.');
  console.info('✅ Plan distribution: 60 Trial, 60 Basic, 40 Premium and 40 Pro.');
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  const existingUsers = await listAllUsers();
  const platformOwner = await verifyPlatformOwner(existingUsers);

  await cleanupOldData(existingUsers);
  const users = await createUsers();
  const events = await createEvents(users, platformOwner.id);

  await verifyDatabase(users, events);
  await verifyLoginAndIsolation(users);
  await verifyPublicPages(events);

  console.info(`✅ Platform owner verified: ${PLATFORM_OWNER_EMAIL}.`);
  console.info(`✅ Shared temporary QA password is configured for all ${USER_COUNT} owners.`);
  console.info(`✅ Completed realistic Production QA replacement in ${Math.round(performance.now() - startedAt)}ms.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
