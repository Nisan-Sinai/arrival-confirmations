export const TABLE_SHAPES = ['round', 'rectangle', 'square', 'banquet'] as const;
export type TableShape = (typeof TABLE_SHAPES)[number];

export const TABLE_SHAPE_LABELS: Record<TableShape, string> = {
  round: 'עגול',
  rectangle: 'מלבני',
  square: 'מרובע',
  banquet: 'אבירים',
};

export interface ProSeatingTable {
  readonly id: string;
  readonly name: string;
  readonly shape: TableShape;
  readonly capacity: number;
  readonly zone: string | null;
  readonly notes: string | null;
  readonly sortOrder: number;
}

export interface ProSeatingGuest {
  readonly id: string;
  readonly fullName: string;
  readonly partySize: number;
  readonly tableId: string | null;
  readonly tableName: string | null;
  readonly seatNumber: string | null;
  readonly seatingGroup: string | null;
  readonly familySide: string | null;
  readonly mealPreference: string | null;
  readonly accessibilityNeeds: string | null;
  readonly priority: number;
  readonly seatLocked: boolean;
}

export interface TableOccupancy extends ProSeatingTable {
  readonly occupied: number;
  readonly remaining: number;
  readonly guestCount: number;
  readonly overCapacity: boolean;
}

export interface SeatingAnalytics {
  readonly totalTables: number;
  readonly totalCapacity: number;
  readonly assignedGuests: number;
  readonly assignedPeople: number;
  readonly unassignedGuests: number;
  readonly unassignedPeople: number;
  readonly emptySeats: number;
  readonly lockedGuests: number;
  readonly overCapacityTables: readonly TableOccupancy[];
  readonly tables: readonly TableOccupancy[];
}

export interface SeatingAssignment {
  readonly guestId: string;
  readonly tableId: string;
  readonly tableName: string;
}

export interface AutoSeatingResult {
  readonly assignments: readonly SeatingAssignment[];
  readonly unassignedGuestIds: readonly string[];
  readonly splitGroups: readonly string[];
}

function cleanGroup(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value.trim();
  return normalized === '' ? null : normalized;
}

function sortedTables(tables: readonly ProSeatingTable[]): ProSeatingTable[] {
  return [...tables].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'he'),
  );
}

export function getSeatingAnalytics(
  tables: readonly ProSeatingTable[],
  guests: readonly ProSeatingGuest[],
): SeatingAnalytics {
  const tableById = new Map(tables.map((table) => [table.id, table] as const));
  const occupied = new Map<string, number>();
  const guestCounts = new Map<string, number>();
  let assignedGuests = 0;
  let assignedPeople = 0;
  let unassignedGuests = 0;
  let unassignedPeople = 0;
  let lockedGuests = 0;

  for (const guest of guests) {
    if (guest.seatLocked) lockedGuests += 1;
    if (guest.tableId !== null && tableById.has(guest.tableId)) {
      assignedGuests += 1;
      assignedPeople += guest.partySize;
      occupied.set(guest.tableId, (occupied.get(guest.tableId) ?? 0) + guest.partySize);
      guestCounts.set(guest.tableId, (guestCounts.get(guest.tableId) ?? 0) + 1);
    } else {
      unassignedGuests += 1;
      unassignedPeople += guest.partySize;
    }
  }

  const summaries = sortedTables(tables).map((table) => {
    const used = occupied.get(table.id) ?? 0;
    return {
      ...table,
      occupied: used,
      remaining: Math.max(0, table.capacity - used),
      guestCount: guestCounts.get(table.id) ?? 0,
      overCapacity: used > table.capacity,
    } satisfies TableOccupancy;
  });
  const totalCapacity = summaries.reduce((sum, table) => sum + table.capacity, 0);

  return {
    totalTables: summaries.length,
    totalCapacity,
    assignedGuests,
    assignedPeople,
    unassignedGuests,
    unassignedPeople,
    emptySeats: Math.max(0, totalCapacity - assignedPeople),
    lockedGuests,
    overCapacityTables: summaries.filter((table) => table.overCapacity),
    tables: summaries,
  };
}

function remainingSeats(remaining: ReadonlyMap<string, number>, tableId: string): number {
  const seats = remaining.get(tableId);
  if (seats === undefined) throw new Error(`Missing capacity for seating table ${tableId}`);
  return seats;
}

function bestFitTable(
  tables: readonly ProSeatingTable[],
  remaining: ReadonlyMap<string, number>,
  people: number,
): ProSeatingTable | null {
  const candidates = tables.filter((table) => remainingSeats(remaining, table.id) >= people);
  candidates.sort((left, right) => {
    const leftAfter = remainingSeats(remaining, left.id) - people;
    const rightAfter = remainingSeats(remaining, right.id) - people;
    return leftAfter - rightAfter || left.sortOrder - right.sortOrder;
  });
  return candidates[0] ?? null;
}

export function autoAssignGuests(
  tables: readonly ProSeatingTable[],
  guests: readonly ProSeatingGuest[],
): AutoSeatingResult {
  const availableTables = sortedTables(tables);
  const tableById = new Map(availableTables.map((table) => [table.id, table] as const));
  const remaining = new Map(availableTables.map((table) => [table.id, table.capacity] as const));
  const assignments: SeatingAssignment[] = [];
  const unassignedGuestIds: string[] = [];
  const splitGroups = new Set<string>();

  for (const guest of guests) {
    if (!guest.seatLocked || guest.tableId === null) continue;
    const table = tableById.get(guest.tableId);
    if (table === undefined) continue;
    assignments.push({ guestId: guest.id, tableId: table.id, tableName: table.name });
    remaining.set(table.id, remainingSeats(remaining, table.id) - guest.partySize);
  }

  const grouped = new Map<string, ProSeatingGuest[]>();
  for (const guest of guests) {
    if (guest.seatLocked && guest.tableId !== null && tableById.has(guest.tableId)) continue;
    const groupName = cleanGroup(guest.seatingGroup) ?? cleanGroup(guest.familySide);
    const key = groupName === null ? `guest:${guest.id}` : `group:${groupName}`;
    const group = grouped.get(key) ?? [];
    group.push(guest);
    grouped.set(key, group);
  }

  const groups = [...grouped.entries()];
  groups.sort(([, left], [, right]) => {
    const leftPriority = Math.max(...left.map((guest) => guest.priority));
    const rightPriority = Math.max(...right.map((guest) => guest.priority));
    const leftSize = left.reduce((sum, guest) => sum + guest.partySize, 0);
    const rightSize = right.reduce((sum, guest) => sum + guest.partySize, 0);
    return rightPriority - leftPriority || rightSize - leftSize;
  });

  for (const [groupKey, group] of groups) {
    group.sort(
      (left, right) =>
        right.priority - left.priority ||
        right.partySize - left.partySize ||
        left.fullName.localeCompare(right.fullName, 'he'),
    );
    const groupPeople = group.reduce((sum, guest) => sum + guest.partySize, 0);
    const wholeGroupTable = bestFitTable(availableTables, remaining, groupPeople);
    if (wholeGroupTable !== null) {
      for (const guest of group) {
        assignments.push({
          guestId: guest.id,
          tableId: wholeGroupTable.id,
          tableName: wholeGroupTable.name,
        });
      }
      remaining.set(
        wholeGroupTable.id,
        remainingSeats(remaining, wholeGroupTable.id) - groupPeople,
      );
      continue;
    }

    const usedTables = new Set<string>();
    for (const guest of group) {
      const table = bestFitTable(availableTables, remaining, guest.partySize);
      if (table === null) {
        unassignedGuestIds.push(guest.id);
        continue;
      }
      assignments.push({ guestId: guest.id, tableId: table.id, tableName: table.name });
      remaining.set(table.id, remainingSeats(remaining, table.id) - guest.partySize);
      usedTables.add(table.id);
    }
    if (groupKey.startsWith('group:') && usedTables.size > 1) {
      splitGroups.add(groupKey.slice('group:'.length));
    }
  }

  return {
    assignments,
    unassignedGuestIds,
    splitGroups: [...splitGroups].sort((left, right) => left.localeCompare(right, 'he')),
  };
}

function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildSeatingCsv(
  guests: readonly ProSeatingGuest[],
  tables: readonly ProSeatingTable[],
): string {
  const tableById = new Map(tables.map((table) => [table.id, table] as const));
  const rows = [
    [
      'שם',
      'כמות',
      'שולחן',
      'אזור',
      'מושב',
      'קבוצה',
      'צד',
      'העדפת אוכל',
      'צרכי נגישות',
      'עדיפות',
      'נעול',
    ],
    ...[...guests]
      .sort((left, right) => left.fullName.localeCompare(right.fullName, 'he'))
      .map((guest) => {
        const table = guest.tableId === null ? undefined : tableById.get(guest.tableId);
        return [
          guest.fullName,
          guest.partySize,
          table?.name ?? guest.tableName ?? '',
          table?.zone ?? '',
          guest.seatNumber ?? '',
          guest.seatingGroup ?? '',
          guest.familySide ?? '',
          guest.mealPreference ?? '',
          guest.accessibilityNeeds ?? '',
          guest.priority,
          guest.seatLocked ? 'כן' : 'לא',
        ];
      }),
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
}
