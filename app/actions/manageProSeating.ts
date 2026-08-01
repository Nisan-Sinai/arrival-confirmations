'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getEventLicense } from '@/app/_lib/eventLicenses';
import { isMonetizedEvent } from '@/app/_lib/plans';
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

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
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

function denied(): ProSeatingState {
  return {
    status: 'error',
    message: 'סטודיו ההושבה המתקדם זמין במסלול Pro פעיל בלבד.',
  };
}

function revalidate(eventId: string): void {
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/tools`);
}

export async function saveProTablesAction(
  _previous: ProSeatingState,
  formData: FormData,
): Promise<ProSeatingState> {
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedProEvent(eventId);
  if (context === null) return denied();

  const ids = formData.getAll('tableId');
  const names = formData.getAll('tableName');
  const shapes = formData.getAll('tableShape');
  const capacities = formData.getAll('tableCapacity');
  const zones = formData.getAll('tableZone');
  const notes = formData.getAll('tableNotes');
  const lengths = [names.length, shapes.length, capacities.length, zones.length, notes.length];
  if (lengths.some((length) => length !== ids.length)) {
    return { status: 'error', message: 'נתוני השולחנות אינם תקינים.' };
  }

  const normalizedNames = names
    .map((_, index) => valueAt(names, index).toLocaleLowerCase('he'))
    .filter((name) => name !== '');
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    return { status: 'error', message: 'לכל שולחן חייב להיות שם ייחודי.' };
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
        if (error) return { status: 'error', message: 'מחיקת שולחן נכשלה.' };
        deleted += 1;
      }
      continue;
    }

    const shapeValue = valueAt(shapes, index);
    const capacity = integer(valueAt(capacities, index), 0);
    if (!isTableShape(shapeValue) || capacity < 1 || capacity > 100) {
      return {
        status: 'error',
        message: `השולחן ${name} מכיל צורה או קיבולת שאינן תקינות.`,
      };
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
    if (error) {
      return {
        status: 'error',
        message: `שמירת השולחן ${name} נכשלה. ודאו שאין שם כפול.`,
      };
    }
    saved += 1;
  }

  revalidate(eventId);
  return {
    status: 'success',
    message: `נשמרו ${saved} שולחנות${deleted > 0 ? ` ונמחקו ${deleted}` : ''}.`,
  };
}

export async function saveProGuestSeatingAction(
  _previous: ProSeatingState,
  formData: FormData,
): Promise<ProSeatingState> {
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedProEvent(eventId);
  if (context === null) return denied();

  const guestIds = formData.getAll('guestId');
  const tableIds = formData.getAll('guestTableId');
  const seatNumbers = formData.getAll('guestSeatNumber');
  const groups = formData.getAll('guestGroup');
  const meals = formData.getAll('guestMeal');
  const accessibility = formData.getAll('guestAccessibility');
  const priorities = formData.getAll('guestPriority');
  const locked = formData.getAll('guestLocked');
  const lengths = [
    tableIds.length,
    seatNumbers.length,
    groups.length,
    meals.length,
    accessibility.length,
    priorities.length,
    locked.length,
  ];
  if (lengths.some((length) => length !== guestIds.length)) {
    return { status: 'error', message: 'נתוני המוזמנים אינם תקינים.' };
  }

  const { data: rawTables, error: tablesError } = await context.db
    .from('event_seating_tables')
    .select('id, name')
    .eq('event_id', eventId);
  if (tablesError) return { status: 'error', message: 'קריאת השולחנות נכשלה.' };
  const tableNames = new Map(
    ((rawTables ?? []) as { id: string; name: string }[]).map((table) => [table.id, table.name]),
  );

  let saved = 0;
  for (let index = 0; index < guestIds.length; index += 1) {
    const guestId = valueAt(guestIds, index);
    const tableIdValue = valueAt(tableIds, index);
    const tableId = tableIdValue === '' ? null : tableIdValue;
    if (guestId === '' || (tableId !== null && !tableNames.has(tableId))) {
      return { status: 'error', message: 'נבחר שולחן שאינו שייך לאירוע.' };
    }
    const priority = integer(valueAt(priorities, index), 0);
    if (priority < 0 || priority > 10) {
      return { status: 'error', message: 'עדיפות הושבה חייבת להיות בין 0 ל-10.' };
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
    if (error) return { status: 'error', message: 'שמירת הושבת המוזמנים נכשלה.' };
    saved += 1;
  }

  revalidate(eventId);
  return { status: 'success', message: `נשמרו פרטי ההושבה של ${saved} מוזמנים.` };
}

export async function autoSeatGuestsAction(
  _previous: ProSeatingState,
  formData: FormData,
): Promise<ProSeatingState> {
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedProEvent(eventId);
  if (context === null) return denied();

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
  if (tablesError || guestsError) {
    return { status: 'error', message: 'טעינת נתוני ההושבה נכשלה.' };
  }

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
  if (tables.length === 0) {
    return { status: 'error', message: 'יש ליצור לפחות שולחן אחד לפני הושבה אוטומטית.' };
  }

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
        mealPreference:
          typeof row['meal_preference'] === 'string' ? row['meal_preference'] : null,
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
  if (clearError) return { status: 'error', message: 'איפוס ההושבה הקודמת נכשל.' };

  for (const assignment of result.assignments) {
    const guest = guests.find((item) => item.id === assignment.guestId);
    if (guest?.seatLocked === true) continue;
    const { error } = await context.db
      .from('guests')
      .update({ table_id: assignment.tableId, table_name: assignment.tableName })
      .eq('event_id', eventId)
      .eq('id', assignment.guestId);
    if (error) return { status: 'error', message: 'שמירת ההושבה האוטומטית נכשלה.' };
  }

  revalidate(eventId);
  const details: string[] = [];
  if (result.unassignedGuestIds.length > 0) {
    details.push(`${result.unassignedGuestIds.length} משפחות לא שובצו בגלל חוסר מקום.`);
  }
  if (result.splitGroups.length > 0) {
    details.push(`קבוצות שפוצלו: ${result.splitGroups.join(', ')}`);
  }
  return {
    status: 'success',
    message: `הושבו אוטומטית ${result.assignments.length} רשומות מוזמנים. מקומות נעולים נשמרו.`,
    details,
  };
}

export async function clearUnlockedSeatingAction(
  _previous: ProSeatingState,
  formData: FormData,
): Promise<ProSeatingState> {
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedProEvent(eventId);
  if (context === null) return denied();

  const { error } = await context.db
    .from('guests')
    .update({ table_id: null, table_name: null, seat_number: null })
    .eq('event_id', eventId)
    .eq('is_active', true)
    .eq('seat_locked', false);
  if (error) return { status: 'error', message: 'איפוס ההושבה נכשל.' };

  revalidate(eventId);
  return { status: 'success', message: 'כל המקומות שאינם נעולים אופסו.' };
}

export async function saveSeatingSnapshotAction(
  _previous: ProSeatingState,
  formData: FormData,
): Promise<ProSeatingState> {
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedProEvent(eventId);
  if (context === null) return denied();

  const label = boundedText(text(formData, 'snapshotLabel'), 120) ??
    `סידור ${new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`;
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
    return { status: 'error', message: 'יצירת נקודת השחזור נכשלה.' };
  }

  const { error } = await context.db.from('event_seating_snapshots').insert({
    event_id: eventId,
    label,
    created_by: context.userId,
    layout: { tables: tables ?? [], guests: guests ?? [] },
  });
  if (error) return { status: 'error', message: 'שמירת נקודת השחזור נכשלה.' };

  revalidate(eventId);
  return { status: 'success', message: `נקודת השחזור „${label}” נשמרה.` };
}
