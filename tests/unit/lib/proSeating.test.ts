import { describe, expect, it } from 'vitest';

import {
  autoAssignGuests,
  buildSeatingCsv,
  getSeatingAnalytics,
  type ProSeatingGuest,
  type ProSeatingTable,
} from '@/lib/proSeating';

const tables: readonly ProSeatingTable[] = [
  {
    id: 'table-a',
    name: 'שולחן 1',
    shape: 'round',
    capacity: 6,
    zone: 'משפחה',
    notes: null,
    sortOrder: 0,
  },
  {
    id: 'table-b',
    name: 'שולחן 2',
    shape: 'rectangle',
    capacity: 4,
    zone: 'חברים',
    notes: 'קרוב לבמה',
    sortOrder: 1,
  },
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
  it('calculates occupancy, empty seats and unassigned guests', () => {
    const result = getSeatingAnalytics(tables, [
      guest({ id: 'a', fullName: 'א', partySize: 3, tableId: 'table-a', tableName: 'שולחן 1' }),
      guest({ id: 'b', fullName: 'ב', partySize: 2 }),
    ]);

    expect(result.totalTables).toBe(2);
    expect(result.totalCapacity).toBe(10);
    expect(result.assignedPeople).toBe(3);
    expect(result.unassignedPeople).toBe(2);
    expect(result.emptySeats).toBe(7);
    expect(result.tables[0]).toMatchObject({ occupied: 3, remaining: 3, overCapacity: false });
  });

  it('detects over-capacity tables without hiding the real occupancy', () => {
    const result = getSeatingAnalytics(tables, [
      guest({ id: 'a', fullName: 'א', partySize: 7, tableId: 'table-a', tableName: 'שולחן 1' }),
    ]);

    expect(result.overCapacityTables).toHaveLength(1);
    expect(result.overCapacityTables[0]).toMatchObject({ occupied: 7, capacity: 6, remaining: 0 });
  });

  it('preserves locked guests and seats a group together when capacity allows', () => {
    const result = autoAssignGuests(tables, [
      guest({
        id: 'locked',
        fullName: 'סבתא',
        partySize: 2,
        tableId: 'table-a',
        tableName: 'שולחן 1',
        seatLocked: true,
        priority: 10,
      }),
      guest({ id: 'g1', fullName: 'משפחה א', partySize: 2, seatingGroup: 'כהן' }),
      guest({ id: 'g2', fullName: 'משפחה ב', partySize: 2, seatingGroup: 'כהן' }),
    ]);

    expect(result.assignments.find((item) => item.guestId === 'locked')).toMatchObject({
      tableId: 'table-a',
    });
    const grouped = result.assignments.filter(
      (item) => item.guestId === 'g1' || item.guestId === 'g2',
    );
    expect(new Set(grouped.map((item) => item.tableId)).size).toBe(1);
    expect(result.unassignedGuestIds).toEqual([]);
  });

  it('reports guests that cannot fit and groups that must be split', () => {
    const result = autoAssignGuests(
      [
        { ...tables[0]!, capacity: 3 },
        { ...tables[1]!, capacity: 3 },
      ],
      [
        guest({ id: 'a', fullName: 'א', partySize: 3, seatingGroup: 'גדולה' }),
        guest({ id: 'b', fullName: 'ב', partySize: 3, seatingGroup: 'גדולה' }),
        guest({ id: 'c', fullName: 'ג', partySize: 2, priority: 10 }),
      ],
    );

    expect(result.splitGroups).toContain('גדולה');
    expect(result.unassignedGuestIds).toContain('c');
  });

  it('exports a UTF-8 CSV that opens cleanly in Excel', () => {
    const csv = buildSeatingCsv(
      [
        guest({
          id: 'a',
          fullName: 'כהן, ישראל',
          partySize: 2,
          tableId: 'table-a',
          tableName: 'שולחן 1',
          mealPreference: 'ללא גלוטן',
          accessibilityNeeds: 'מעבר רחב',
          seatLocked: true,
        }),
      ],
      tables,
    );

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"כהן, ישראל"');
    expect(csv).toContain('שולחן 1');
    expect(csv).toContain('ללא גלוטן');
    expect(csv).toContain('כן');
  });
});
