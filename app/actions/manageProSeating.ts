'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getEventLicense } from '@/app/_lib/eventLicenses';
import { isMonetizedEvent } from '@/app/_lib/plans';
import { defaultLocale, isLocale, localePath, type Locale } from '@/lib/i18n';
import {
  autoAssignGuests,
  TABLE_SHAPES,
  type ProSeatingGuest,
  type ProSeatingTable,
  type TableShape,
} from '@/lib/proSeating';
import { createUserClient } from '@/lib/server/supabase';

export interface ProSeatingState {
  readonly status: 'idle' | 'success' | 'error';
  readonly message: string;
  readonly details?: readonly string[];
}

interface OwnedProContext {
  readonly db: SupabaseClient;
  readonly eventId: string;
  readonly userId: string;
}

const COPY = {
  he: {
    denied: 'סטודיו ההושבה המתקדם זמין במסלול Pro פעיל בלבד.',
    invalidTables: 'נתוני השולחנות אינם תקינים.',
    uniqueTable: 'לכל שולחן חייב להיות שם ייחודי.',
    deleteTableFailed: 'מחיקת שולחן נכשלה.',
    invalidTable: (name: string) => `השולחן ${name} מכיל צורה או קיבולת שאינן תקינות.`,
    saveTableFailed: (name: string) => `שמירת השולחן ${name} נכשלה. ודאו שאין שם כפול.`,
    tablesSaved: (saved: number, deleted: number) => `נשמרו ${saved} שולחנות${deleted > 0 ? ` ונמחקו ${deleted}` : ''}.`,
    invalidGuests: 'נתוני המוזמנים אינם תקינים.',
    readTablesFailed: 'קריאת השולחנות נכשלה.',
    wrongTable: 'נבחר שולחן שאינו שייך לאירוע.',
    invalidPriority: 'עדיפות הושבה חייבת להיות בין 0 ל-10.',
    saveGuestsFailed: 'שמירת הושבת המוזמנים נכשלה.',
    guestsSaved: (saved: number) => `נשמרו פרטי ההושבה של ${saved} מוזמנים.`,
    loadFailed: 'טעינת נתוני ההושבה נכשלה.',
    needTable: 'יש ליצור לפחות שולחן אחד לפני הושבה אוטומטית.',
    clearPreviousFailed: 'איפוס ההושבה הקודמת נכשל.',
    autoSaveFailed: 'שמירת ההושבה האוטומטית נכשלה.',
    unassigned: (count: number) => `${count} משפחות לא שובצו בגלל חוסר מקום.`,
    splitGroups: (groups: string) => `קבוצות שפוצלו: ${groups}`,
    autoSaved: (count: number) => `הושבו אוטומטית ${count} רשומות מוזמנים. מקומות נעולים נשמרו.`,
    clearFailed: 'איפוס ההושבה נכשל.',
    cleared: 'כל המקומות שאינם נעולים אופסו.',
    defaultSnapshot: (date: string) => `סידור ${date}`,
    snapshotCreateFailed: 'יצירת נקודת השחזור נכשלה.',
    snapshotSaveFailed: 'שמירת נקודת השחזור נכשלה.',
    snapshotSaved: (label: string) => `נקודת השחזור „${label}” נשמרה.`,
  },
  en: {
    denied: 'The advanced seating studio is available only on an active Pro plan.',
    invalidTables: 'The table data is invalid.',
    uniqueTable: 'Each table must have a unique name.',
    deleteTableFailed: 'We could not delete the table.',
    invalidTable: (name: string) => `Table ${name} has an invalid shape or capacity.`,
    saveTableFailed: (name: string) => `We could not save table ${name}. Make sure its name is unique.`,
    tablesSaved: (saved: number, deleted: number) => `Saved ${saved} tables${deleted > 0 ? ` and deleted ${deleted}` : ''}.`,
    invalidGuests: 'The guest seating data is invalid.',
    readTablesFailed: 'We could not load the tables.',
    wrongTable: 'The selected table does not belong to this event.',
    invalidPriority: 'Seating priority must be between 0 and 10.',
    saveGuestsFailed: 'We could not save guest seating.',
    guestsSaved: (saved: number) => `Saved seating details for ${saved} guests.`,
    loadFailed: 'We could not load the seating data.',
    needTable: 'Create at least one table before running automatic seating.',
    clearPreviousFailed: 'We could not clear the previous seating.',
    autoSaveFailed: 'We could not save the automatic seating.',
    unassigned: (count: number) => `${count} families could not be seated because there was not enough space.`,
    splitGroups: (groups: string) => `Split groups: ${groups}`,
    autoSaved: (count: number) => `Automatically seated ${count} guest records. Locked seats were preserved.`,
    clearFailed: 'We could not reset the seating.',
    cleared: 'All unlocked seats were reset.',
    defaultSnapshot: (date: string) => `Seating ${date}`,
    snapshotCreateFailed: 'We could not create the restore point.',
    snapshotSaveFailed: 'We could not save the restore point.',
    snapshotSaved: (label: string) => `Restore point “${label}” was saved.`,
  },
} as const;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function localeOf(formData: FormData): Locale {
  const value = formData.get('locale');
  return typeof value === 'string' && isLocale(value) ? value : defaultLocale;
}

function valueAt(values: readonly FormDataEntryValue[], index: number): string {
  const value = values[index];
  return typeof value === 'string' ? value.trim() : '';
}

function boundedText(value: string, maxLength: number): string | null {
  const normalized = value.trim();
  return normalized === '' ? null : normalized.slice(0, maxLength);
}

function integer(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function isTableShape(value: string): value is TableShape {
  return TABLE_SHAPES.includes(value as TableShape);
}

async function requireOwnedProEvent(eventId: string): Promise<OwnedProContext | null> {
  if (eventId === '') return null;
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) return null;

  const db = supabase as unknown as SupabaseClient;
  const { data: event } = await db
    .from('events')
    .select('id, created_at')
    .eq('id', eventId)
    .maybeSingle();
  if (event === null) return null;

  const createdAt = (event as { created_at: string }).created_at;
  const license = await getEventLicense(eventId, isMonetizedEvent(createdAt) ? 'trial' : 'legacy');
  if (license.plan !== 'pro' || license.status !== 'active') return null;
  return { db, eventId, userId: user.id };
}

function denied(locale: Locale): ProSeatingState {
  return { status: 'error', message: COPY[locale].denied };
}

function revalidate(eventId: string, locale: Locale): void {
  revalidatePath(localePath(locale, `/dashboard/events/${eventId}`));
  revalidatePath(localePath(locale, `/dashboard/events/${eventId}/tools`));
}

export async function saveProTablesAction(
  _previous: ProSeatingState,
  formData: FormData,
): Promise<ProSeatingState> {
  const locale = localeOf(formData);
  const copy = COPY[locale];
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedProEvent(eventId);
  if (context === null) return denied(locale);

  const ids = formData.getAll('tableId');
  const names = formData.getAll('tableName');
  const shapes = formData.getAll('tableShape');
  const capacities = formData.getAll('tableCapacity');
  const zones = formData.getAll('tableZone');
  const notes = formData.getAll('tableNotes');
  const lengths = [names.length, shapes.length, capacities.length, zones.length, notes.length];
  if (lengths.some((length) => length !== ids.length)) {
    return { status: 'error', message: copy.invalidTables };
  }

  const language = locale === 'he' ? 'he' : 'en';
  const normalizedNames = names
    .map((_, index) => valueAt(names, index).toLocaleLowerCase(language))
    .filter((name) => name !== '');
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    return { status: 'error', message: copy.uniqueTable };
  }

  let saved = 0;
  let deleted = 0;
  for (let index = 0; index < ids.length; index += 1) {
    const id = valueAt(ids, index);
    const name = valueAt(names, index);
    if (name === '') {
      if (id !== '') {
        const { error } = await context.db
          .from('event_seating_tables')
          .delete()
          .eq('event_id', eventId)
          .eq('id', id);
        if (error) return { status: 'error', message: copy.deleteTableFailed };
        deleted += 1;
      }
      continue;
    }

    const shapeValue = valueAt(shapes, index);
    const capacity = integer(valueAt(capacities, index), 0);
    if (!isTableShape(shapeValue) || capacity < 1 || capacity > 100) {
      return { status: 'error', message: copy.invalidTable(name) };
    }

    const payload = {
      event_id: eventId,
      name: name.slice(0, 80),
      shape: shapeValue,
      capacity,
      zone: boundedText(valueAt(zones, index), 80),
      notes: boundedText(valueAt(notes, index), 500),
      sort_order: index,
      updated_at: new Date().toISOString(),
    };
    const query =
      id === ''
        ? context.db.from('event_seating_tables').insert(payload)
        : context.db
            .from('event_seating_tables')
            .update(payload)
            .eq('event_id', eventId)
            .eq('id', id);
    const { error } = await query;
    if (error) return { status: 'error', message: copy.saveTableFailed(name) };
    saved += 1;
  }

  revalidate(eventId, locale);
  return { status: 'success', message: copy.tablesSaved(saved, deleted) };
}

export async function saveProGuestSeatingAction(
  _previous: ProSeatingState,
  formData: FormData,
): Promise<ProSeatingState> {
  const locale = localeOf(formData);
  const copy = COPY[locale];
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedProEvent(eventId);
  if (context === null) return denied(locale);

  const guestIds = formData.getAll('guestId');
  const tableIds = formData.getAll('guestTableId');
  const seatNumbers = formData.getAll('guestSeatNumber');
  const groups = formData.getAll('guestGroup');
  const meals = formData.getAll('guestMeal');
  const accessibility = formData.getAll('guestAccessibility');
  const priorities = formData.getAll('guestPriority');
  const locked = formData.getAll('guestLocked');
  const lengths = [tableIds.length, seatNumbers.length, groups.length, meals.length, accessibility.length, priorities.length, locked.length];
  if (lengths.some((length) => length !== guestIds.length)) {
    return { status: 'error', message: copy.invalidGuests };
  }

  const { data: rawTables, error: tablesError } = await context.db
    .from('event_seating_tables')
    .select('id, name')
    .eq('event_id', eventId);
  if (tablesError) return { status: 'error', message: copy.readTablesFailed };
  const tableNames = new Map(
    ((rawTables ?? []) as { id: string; name: string }[]).map((table) => [table.id, table.name]),
  );

  let saved = 0;
  for (let index = 0; index < guestIds.length; index += 1) {
    const guestId = valueAt(guestIds, index);
    const tableIdValue = valueAt(tableIds, index);
    const tableId = tableIdValue === '' ? null : tableIdValue;
    if (guestId === '' || (tableId !== null && !tableNames.has(tableId))) {
      return { status: 'error', message: copy.wrongTable };
    }
    const priority = integer(valueAt(priorities, index), 0);
    if (priority < 0 || priority > 10) {
      return { status: 'error', message: copy.invalidPriority };
    }

    const { error } = await context.db
      .from('guests')
      .update({
        table_id: tableId,
        table_name: tableId === null ? null : tableNames.get(tableId),
        seat_number: boundedText(valueAt(seatNumbers, index), 40),
        seating_group: boundedText(valueAt(groups, index), 120),
        meal_preference: boundedText(valueAt(meals, index), 120),
        accessibility_needs: boundedText(valueAt(accessibility, index), 500),
        seating_priority: priority,
        seat_locked: valueAt(locked, index) === 'true',
      })
      .eq('event_id', eventId)
      .eq('id', guestId);
    if (error) return { status: 'error', message: copy.saveGuestsFailed };
    saved += 1;
  }

  revalidate(eventId, locale);
  return { status: 'success', message: copy.guestsSaved(saved) };
}

export async function autoSeatGuestsAction(
  _previous: ProSeatingState,
  formData: FormData,
): Promise<ProSeatingState> {
  const locale = localeOf(formData);
  const copy = COPY[locale];
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedProEvent(eventId);
  if (context === null) return denied(locale);

  const [{ data: rawTables, error: tablesError }, { data: rawGuests, error: guestsError }] =
    await Promise.all([
      context.db
        .from('event_seating_tables')
        .select('id, name, shape, capacity, zone, notes, sort_order')
        .eq('event_id', eventId)
        .order('sort_order'),
      context.db
        .from('guests')
        .select(
          'id, full_name, party_size, table_id, table_name, seat_number, seating_group, family_side, meal_preference, accessibility_needs, seating_priority, seat_locked',
        )
        .eq('event_id', eventId)
        .eq('is_active', true),
    ]);
  if (tablesError || guestsError) return { status: 'error', message: copy.loadFailed };

  const tables = ((rawTables ?? []) as Record<string, unknown>[]).map(
    (row) =>
      ({
        id: String(row['id']),
        name: String(row['name']),
        shape: row['shape'] as TableShape,
        capacity: Number(row['capacity']),
        zone: typeof row['zone'] === 'string' ? row['zone'] : null,
        notes: typeof row['notes'] === 'string' ? row['notes'] : null,
        sortOrder: Number(row['sort_order']),
      }) satisfies ProSeatingTable,
  );
  if (tables.length === 0) return { status: 'error', message: copy.needTable };

  const guests = ((rawGuests ?? []) as Record<string, unknown>[]).map(
    (row) =>
      ({
        id: String(row['id']),
        fullName: String(row['full_name']),
        partySize: Number(row['party_size']),
        tableId: typeof row['table_id'] === 'string' ? row['table_id'] : null,
        tableName: typeof row['table_name'] === 'string' ? row['table_name'] : null,
        seatNumber: typeof row['seat_number'] === 'string' ? row['seat_number'] : null,
        seatingGroup: typeof row['seating_group'] === 'string' ? row['seating_group'] : null,
        familySide: typeof row['family_side'] === 'string' ? row['family_side'] : null,
        mealPreference: typeof row['meal_preference'] === 'string' ? row['meal_preference'] : null,
        accessibilityNeeds:
          typeof row['accessibility_needs'] === 'string' ? row['accessibility_needs'] : null,
        priority: Number(row['seating_priority']),
        seatLocked: row['seat_locked'] === true,
      }) satisfies ProSeatingGuest,
  );
  const result = autoAssignGuests(tables, guests);

  const { error: clearError } = await context.db
    .from('guests')
    .update({ table_id: null, table_name: null, seat_number: null })
    .eq('event_id', eventId)
    .eq('is_active', true)
    .eq('seat_locked', false);
  if (clearError) return { status: 'error', message: copy.clearPreviousFailed };

  for (const assignment of result.assignments) {
    const guest = guests.find((item) => item.id === assignment.guestId);
    if (guest?.seatLocked === true) continue;
    const { error } = await context.db
      .from('guests')
      .update({ table_id: assignment.tableId, table_name: assignment.tableName })
      .eq('event_id', eventId)
      .eq('id', assignment.guestId);
    if (error) return { status: 'error', message: copy.autoSaveFailed };
  }

  revalidate(eventId, locale);
  const details: string[] = [];
  if (result.unassignedGuestIds.length > 0) details.push(copy.unassigned(result.unassignedGuestIds.length));
  if (result.splitGroups.length > 0) details.push(copy.splitGroups(result.splitGroups.join(', ')));
  return {
    status: 'success',
    message: copy.autoSaved(result.assignments.length),
    details,
  };
}

export async function clearUnlockedSeatingAction(
  _previous: ProSeatingState,
  formData: FormData,
): Promise<ProSeatingState> {
  const locale = localeOf(formData);
  const copy = COPY[locale];
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedProEvent(eventId);
  if (context === null) return denied(locale);

  const { error } = await context.db
    .from('guests')
    .update({ table_id: null, table_name: null, seat_number: null })
    .eq('event_id', eventId)
    .eq('is_active', true)
    .eq('seat_locked', false);
  if (error) return { status: 'error', message: copy.clearFailed };

  revalidate(eventId, locale);
  return { status: 'success', message: copy.cleared };
}

export async function saveSeatingSnapshotAction(
  _previous: ProSeatingState,
  formData: FormData,
): Promise<ProSeatingState> {
  const locale = localeOf(formData);
  const copy = COPY[locale];
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedProEvent(eventId);
  if (context === null) return denied(locale);

  const date = new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());
  const label = boundedText(text(formData, 'snapshotLabel'), 120) ?? copy.defaultSnapshot(date);
  const [{ data: tables, error: tablesError }, { data: guests, error: guestsError }] =
    await Promise.all([
      context.db
        .from('event_seating_tables')
        .select('id, name, shape, capacity, zone, notes, sort_order')
        .eq('event_id', eventId)
        .order('sort_order'),
      context.db
        .from('guests')
        .select(
          'id, full_name, party_size, table_id, table_name, seat_number, seating_group, family_side, meal_preference, accessibility_needs, seating_priority, seat_locked',
        )
        .eq('event_id', eventId)
        .eq('is_active', true),
    ]);
  if (tablesError || guestsError) {
    return { status: 'error', message: copy.snapshotCreateFailed };
  }

  const { error } = await context.db.from('event_seating_snapshots').insert({
    event_id: eventId,
    label,
    created_by: context.userId,
    layout: { tables: tables ?? [], guests: guests ?? [] },
  });
  if (error) return { status: 'error', message: copy.snapshotSaveFailed };

  revalidate(eventId, locale);
  return { status: 'success', message: copy.snapshotSaved(label) };
}
