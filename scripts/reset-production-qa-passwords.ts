import { randomBytes } from 'node:crypto';

import { createClient, type User } from '@supabase/supabase-js';

const SEED_TAG = 'production-admin-demo-v1';
const USER_COUNT = 20;
const EVENTS_PER_USER = 10;

const ACCOUNT_NAMES = [
  'דניאל כהן',
  'נועה לוי',
  'אורי מזרחי',
  'מיכל פרץ',
  'יונתן אברהם',
  'שירה ביטון',
  'רועי חדד',
  'תמר מלכה',
  'איתי גבאי',
  'יעל דהן',
  'עומר סויסה',
  'מאיה אזולאי',
  'אלעד בן דוד',
  'רוני שלום',
  'נדב וקנין',
  'הילה עמר',
  'אדם אלפסי',
  'ליאור דיין',
  'אביגיל בוסקילה',
  'מתן שמואל',
] as const;

const EVENT_BLUEPRINTS = [
  { type: 'wedding', title: 'חתונת', venue: 'גני השרון', city: 'נתניה', guests: 320 },
  { type: 'bar_mitzvah', title: 'בר המצווה של', venue: 'אולמי רויאל', city: 'כפר סבא', guests: 140 },
  { type: 'brit_mila', title: 'ברית המילה של', venue: 'מרלו בוטיק', city: 'נתניה', guests: 95 },
  { type: 'birthday', title: 'יום ההולדת של', venue: 'בית על הים', city: 'הרצליה', guests: 85 },
  { type: 'other', title: 'אירוע משפחתי לכבוד', venue: 'חצר המלכה', city: 'חדרה', guests: 180 },
  { type: 'wedding', title: 'חתונת', venue: 'לוקא', city: 'משמר השרון', guests: 420 },
  { type: 'bar_mitzvah', title: 'בר המצווה של', venue: 'אחוזת סנדרין', city: 'רגבה', guests: 210 },
  { type: 'brit_mila', title: 'ברית המילה של', venue: 'אולמי אלכסנדר', city: 'עמק חפר', guests: 120 },
  { type: 'birthday', title: 'יום ההולדת של', venue: 'סטוקו', city: 'תל אביב', guests: 110 },
  { type: 'other', title: 'מסיבת האירוסין של', venue: 'טרמינל', city: 'פתח תקווה', guests: 260 },
] as const;

const HONOREE_NAMES = [
  'נועה ועומר',
  'יואב',
  'איתן',
  'מיכל',
  'משפחת כהן',
  'שירה ואלעד',
  'אורי',
  'רפאל',
  'תמר',
  'מאיה ונדב',
] as const;

function requiredEnvironment(name: 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value === '') throw new Error(`${name} is required`);
  return value;
}

const supabaseUrl = requiredEnvironment('SUPABASE_URL');
const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY');
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

function qaEmail(userNumber: number): string {
  return `qa-arrival-owner-${String(userNumber).padStart(2, '0')}@example.com`;
}

async function listAllUsers(): Promise<User[]> {
  const users: User[] = [];
  const perPage = 1_000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error !== null) throw new Error(`Unable to list users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < perPage) return users;
  }
}

function eventDate(userNumber: number, eventNumber: number): string {
  const offset = userNumber * 4 + eventNumber * 9;
  const date = new Date(Date.UTC(2026, 8, 1 + offset));
  return date.toISOString().slice(0, 10);
}

function realisticPhone(userNumber: number, eventNumber: number): string {
  const suffix = String(userNumber * 100 + eventNumber).padStart(4, '0');
  return `050-700-${suffix}`;
}

async function updateAccount(user: User, userNumber: number, password: string): Promise<void> {
  if (user.user_metadata?.['qa_seed_tag'] !== SEED_TAG) {
    throw new Error(`Refusing to update non-QA account ${user.email ?? user.id}`);
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: {
      ...user.user_metadata,
      display_name: ACCOUNT_NAMES[userNumber - 1],
      qa_seed_tag: SEED_TAG,
      qa_demo_account: true,
    },
  });
  if (error !== null) throw new Error(`Unable to update ${user.email}: ${error.message}`);
}

async function updateEvents(user: User, userNumber: number): Promise<void> {
  const { data: events, error } = await admin
    .from('events')
    .select('id, public_id, title')
    .eq('owner_user_id', user.id)
    .like('public_id', `qa-prod-u${String(userNumber).padStart(2, '0')}-%`)
    .order('public_id', { ascending: true });

  if (error !== null) throw new Error(`Unable to list events for ${user.email}: ${error.message}`);
  if ((events ?? []).length !== EVENTS_PER_USER) {
    throw new Error(`${user.email} has ${(events ?? []).length} QA events; expected 10.`);
  }

  for (let index = 0; index < EVENTS_PER_USER; index += 1) {
    const event = events![index]!;
    if (!event.title.startsWith('[QA-PROD]')) {
      throw new Error(`Refusing to overwrite non-QA event ${event.id}`);
    }

    const blueprint = EVENT_BLUEPRINTS[index]!;
    const honoree = HONOREE_NAMES[index]!;
    const eventNumber = index + 1;
    const familyName = ACCOUNT_NAMES[userNumber - 1]!.split(' ').at(-1) ?? `QA ${userNumber}`;

    const { error: updateError } = await admin
      .from('events')
      .update({
        event_type: blueprint.type,
        title: `[QA-PROD] ${blueprint.title} ${honoree} — משפחת ${familyName}`,
        hosts_names: `משפחת ${familyName}`,
        honoree_display_name: honoree,
        event_date: eventDate(userNumber, eventNumber),
        ceremony_time: eventNumber % 3 === 0 ? '12:30:00' : '20:00:00',
        reception_time: eventNumber % 3 === 0 ? '11:45:00' : '19:00:00',
        venue_name: blueprint.venue,
        address: `${blueprint.venue}, ${blueprint.city}`,
        contact_phone: realisticPhone(userNumber, eventNumber),
        description:
          'אירוע הדגמה קבוע בסביבת Production לצורך בדיקת הרשאות, מסלולים, אישורי הגעה וסידורי הושבה. כל הפרטים בדויים.',
        expected_guests: blueprint.guests + userNumber * 2,
        is_active: false,
      })
      .eq('id', event.id);

    if (updateError !== null) {
      throw new Error(`Unable to update ${event.public_id}: ${updateError.message}`);
    }
  }
}

async function verifyLogin(email: string, password: string): Promise<void> {
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error !== null || data.user?.email?.toLowerCase() !== email.toLowerCase()) {
    throw new Error(`Login verification failed for ${email}: ${error?.message ?? 'wrong user'}`);
  }
  await client.auth.signOut();
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  const password = `QaDemo-${randomBytes(18).toString('base64url')}!7a`;
  const allUsers = await listAllUsers();

  for (let userNumber = 1; userNumber <= USER_COUNT; userNumber += 1) {
    const email = qaEmail(userNumber);
    const user = allUsers.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user === undefined) throw new Error(`Missing QA account ${email}`);

    await updateAccount(user, userNumber, password);
    await updateEvents(user, userNumber);
    await verifyLogin(email, password);
  }

  console.info('✅ All 20 QA account passwords were reset and login was verified.');
  console.info('✅ All 200 persistent Production events were refreshed with realistic synthetic details.');
  console.info('✅ Events remain drafts and are marked [QA-PROD].');
  console.info(`QA_SHARED_PASSWORD=${password}`);
  console.info(`✅ Completed in ${Math.round(performance.now() - startedAt)}ms.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
