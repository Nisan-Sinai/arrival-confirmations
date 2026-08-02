import { describe, expect, it } from 'vitest';

import {
  autoAssignGuests,
  buildSeatingCsv,
  getSeatingAnalytics,
  type ProSeatingGuest,
  type ProSeatingTable,
} from '@/lib/proSeating';

function table(
  id: string,
  name: string,
  capacity: number,
  sortOrder: number,
  zone: string | null = null,
): ProSeatingTable {
  return {
    id,
    name,
    shape: sortOrder % 2 === 0 ? 'round' : 'rectangle',
    capacity,
    zone,
    notes: null,
    sortOrder,
  };
}

const tables: readonly ProSeatingTable[] = [
  table('table-a', 'שולחן 1', 6, 0, 'משפחה'),
  { ...table('table-b', 'שולחן 2', 4, 1, 'חברים'), notes: 'קרוב לבמה' },
];

function guest(
  overrides: Partial<ProSeatingGuest> & Pick<ProSeatingGuest, 'id' | 'fullName'>,
): ProSeatingGuest {
  return {
    id: overrides.id,
    fullName: overrides.fullName,
    partySize: overrides.partySize ?? 1,
    tableId: overrides.tableId ?? null,
    tableName: overrides.tableName ?? null,
    seatNumber: overrides.seatNumber ?? null,
    seatingGroup: overrides.seatingGroup ?? null,
    familySide: overrides.familySide ?? null,
    mealPreference: overrides.mealPreference ?? null,
    accessibilityNeeds: overrides.accessibilityNeeds ?? null,
    priority: overrides.priority ?? 0,
    seatLocked: overrides.seatLocked ?? false,
  };
}

describe('Pro seating', () => {
  it('calculates repeat occupancy, locked seats, unknown tables and name tie sorting', () => {
    const sameOrderTables = [table('table-b', 'ב', 5, 0), table('table-a', 'א', 5, 0)];
    const result = getSeatingAnalytics(sameOrderTables, [
      guest({
        id: 'a',
        fullName: 'א',
        partySize: 2,
        tableId: 'table-a',
        tableName: 'א',
        seatLocked: true,
      }),
      guest({ id: 'b', fullName: 'ב', tableId: 'table-a', tableName: 'א' }),
      guest({ id: 'c', fullName: 'ג', partySize: 4, tableId: 'missing' }),
      guest({ id: 'd', fullName: 'ד' }),
    ]);

    expect(result).toMatchObject({
      totalTables: 2,
      totalCapacity: 10,
      assignedGuests: 2,
      assignedPeople: 3,
      unassignedGuests: 2,
      unassignedPeople: 5,
      emptySeats: 7,
      lockedGuests: 1,
    });
    expect(result.tables.map((item) => item.name)).toEqual(['א', 'ב']);
    expect(result.tables[0]).toMatchObject({ occupied: 3, guestCount: 2, remaining: 2 });
    expect(result.tables[1]).toMatchObject({ occupied: 0, guestCount: 0, remaining: 5 });
  });

  it('detects over-capacity tables and clamps negative empty-seat values', () => {
    const result = getSeatingAnalytics(
      [table('small', 'קטן', 2, 0)],
      [guest({ id: 'a', fullName: 'א', partySize: 3, tableId: 'small', tableName: 'קטן' })],
    );

    expect(result.emptySeats).toBe(0);
    expect(result.overCapacityTables).toHaveLength(1);
    expect(result.overCapacityTables[0]).toMatchObject({
      occupied: 3,
      capacity: 2,
      remaining: 0,
      overCapacity: true,
    });
  });

  it('preserves valid locks while safely regrouping null and stale locks', () => {
    const result = autoAssignGuests(
      [table('main', 'מרכזי', 10, 0)],
      [
        guest({
          id: 'valid-lock',
          fullName: 'סבתא',
          partySize: 2,
          tableId: 'main',
          tableName: 'מרכזי',
          seatLocked: true,
        }),
        guest({
          id: 'stale-lock',
          fullName: 'דוד',
          tableId: 'missing',
          seatLocked: true,
          seatingGroup: '   ',
          familySide: 'צד א',
        }),
        guest({ id: 'null-lock', fullName: 'דודה', tableId: null, seatLocked: true }),
        guest({ id: 'normal', fullName: 'חבר', seatingGroup: 'חברים' }),
      ],
    );

    expect(result.assignments).toHaveLength(4);
    expect(result.assignments.find((item) => item.guestId === 'valid-lock')).toMatchObject({
      tableId: 'main',
    });
    expect(result.unassignedGuestIds).toEqual([]);
  });

  it('chooses the tightest fitting table and resolves equal fits by table order', () => {
    const tightFit = autoAssignGuests(
      [table('wide', 'רחב', 6, 0), table('tight', 'מדויק', 4, 1)],
      [guest({ id: 'g', fullName: 'אורח', partySize: 2 })],
    );
    expect(tightFit.assignments[0]?.tableId).toBe('tight');

    const orderedFit = autoAssignGuests(
      [table('late', 'מאוחר', 4, 2), table('early', 'מוקדם', 4, 1)],
      [guest({ id: 'g', fullName: 'אורח', partySize: 2 })],
    );
    expect(orderedFit.assignments[0]?.tableId).toBe('early');
  });

  it('orders independent groups by priority and then by total party size', () => {
    const result = autoAssignGuests(
      [table('main', 'מרכזי', 20, 0)],
      [
        guest({ id: 'small', fullName: 'קטן', partySize: 1, seatingGroup: 'קטן' }),
        guest({ id: 'big', fullName: 'גדול', partySize: 3, seatingGroup: 'גדול' }),
        guest({
          id: 'priority',
          fullName: 'חשוב',
          partySize: 1,
          seatingGroup: 'חשובים',
          priority: 10,
        }),
      ],
    );

    expect(result.assignments.map((item) => item.guestId)).toEqual(['priority', 'big', 'small']);
  });

  it('orders members inside a split group by priority, size and then name', () => {
    const priorityResult = autoAssignGuests(
      [table('a', 'א', 1, 0), table('b', 'ב', 1, 1)],
      [
        guest({ id: 'low', fullName: 'נמוך', seatingGroup: 'קבוצה', priority: 0 }),
        guest({ id: 'high', fullName: 'גבוה', seatingGroup: 'קבוצה', priority: 5 }),
      ],
    );
    expect(priorityResult.assignments[0]?.guestId).toBe('high');

    const sizeResult = autoAssignGuests(
      [table('a', 'א', 2, 0), table('b', 'ב', 1, 1)],
      [
        guest({ id: 'small', fullName: 'קטן', partySize: 1, seatingGroup: 'קבוצה' }),
        guest({ id: 'large', fullName: 'גדול', partySize: 2, seatingGroup: 'קבוצה' }),
      ],
    );
    expect(sizeResult.assignments[0]?.guestId).toBe('large');

    const nameResult = autoAssignGuests(
      [table('a', 'א', 1, 0), table('b', 'ב', 1, 1)],
      [
        guest({ id: 'later', fullName: 'תמר', seatingGroup: 'קבוצה' }),
        guest({ id: 'earlier', fullName: 'אברהם', seatingGroup: 'קבוצה' }),
      ],
    );
    expect(nameResult.assignments[0]?.guestId).toBe('earlier');
  });

  it('keeps a whole family together when one table has enough capacity', () => {
    const result = autoAssignGuests(tables, [
      guest({ id: 'g1', fullName: 'משפחה א', partySize: 2, seatingGroup: 'כהן' }),
      guest({ id: 'g2', fullName: 'משפחה ב', partySize: 2, seatingGroup: 'כהן' }),
    ]);

    const assignedTables = new Set(result.assignments.map((item) => item.tableId));
    expect(assignedTables.size).toBe(1);
    expect(result.unassignedGuestIds).toEqual([]);
  });

  it('sorts multiple split-group warnings and reports oversized guests', () => {
    const result = autoAssignGuests(
      [
        table('t1', '1', 2, 0),
        table('t2', '2', 2, 1),
        table('t3', '3', 2, 2),
        table('t4', '4', 2, 3),
      ],
      [
        guest({ id: 'huge', fullName: 'גדול מדי', partySize: 3, priority: 10 }),
        guest({ id: 'z1', fullName: 'ז1', partySize: 2, seatingGroup: 'זוגות ז' }),
        guest({ id: 'z2', fullName: 'ז2', partySize: 2, seatingGroup: 'זוגות ז' }),
        guest({ id: 'a1', fullName: 'א1', partySize: 2, seatingGroup: 'זוגות א' }),
        guest({ id: 'a2', fullName: 'א2', partySize: 2, seatingGroup: 'זוגות א' }),
      ],
    );

    expect(result.unassignedGuestIds).toContain('huge');
    expect(result.splitGroups).toEqual(['זוגות א', 'זוגות ז']);
  });

  it('does not report a split when only part of a group can be seated', () => {
    const result = autoAssignGuests(
      [table('only', 'יחיד', 2, 0)],
      [
        guest({ id: 'a', fullName: 'א', partySize: 2, seatingGroup: 'משפחה' }),
        guest({ id: 'b', fullName: 'ב', partySize: 2, seatingGroup: 'משפחה' }),
      ],
    );

    expect(result.assignments).toHaveLength(1);
    expect(result.unassignedGuestIds).toHaveLength(1);
    expect(result.splitGroups).toEqual([]);
  });

  it('reports an ungrouped guest when no table exists', () => {
    const result = autoAssignGuests([], [guest({ id: 'a', fullName: 'א' })]);
    expect(result).toEqual({
      assignments: [],
      unassignedGuestIds: ['a'],
      splitGroups: [],
    });
  });

  it('exports all table and guest fallbacks in an Excel-compatible UTF-8 CSV', () => {
    const csvTables = [
      table('with-zone', 'שולחן משפחה', 5, 0, 'משפחה'),
      table('no-zone', 'שולחן שקט', 5, 1),
    ];
    const csv = buildSeatingCsv(
      [
        guest({
          id: 'quoted',
          fullName: 'כהן, "ישראל"',
          partySize: 2,
          tableId: 'with-zone',
          tableName: 'שם ישן',
          seatNumber: '3',
          seatingGroup: 'כהן',
          familySide: 'צד א',
          mealPreference: 'ללא גלוטן',
          accessibilityNeeds: 'מעבר רחב',
          priority: 8,
          seatLocked: true,
        }),
        guest({ id: 'zone-null', fullName: 'אלמוני', tableId: 'no-zone', seatLocked: false }),
        guest({ id: 'fallback', fullName: 'בית', tableId: 'missing', tableName: 'שולחן ידני' }),
        guest({ id: 'empty', fullName: 'גימל', tableId: null, tableName: null }),
      ],
      csvTables,
    );

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"כהן, ""ישראל"""');
    expect(csv).toContain('שולחן משפחה,משפחה,3,כהן,צד א,ללא גלוטן,מעבר רחב,8,כן');
    expect(csv).toContain('שולחן שקט');
    expect(csv).toContain('שולחן ידני');
    expect(csv).toContain('לא');
  });
});
