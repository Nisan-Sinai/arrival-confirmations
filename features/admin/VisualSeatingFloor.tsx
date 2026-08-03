'use client';

import { useActionState, useMemo, useState } from 'react';
import type { DragEvent } from 'react';

import {
  saveProGuestSeatingAction,
  type ProSeatingState,
} from '@/app/actions/manageProSeating';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import {
  getSeatingAnalytics,
  TABLE_SHAPE_LABELS,
  type ProSeatingGuest,
  type ProSeatingTable,
  type TableShape,
} from '@/lib/proSeating';

const INITIAL: ProSeatingState = { status: 'idle', message: '' };
const UNASSIGNED = 'unassigned';

type AssignmentMap = Readonly<Record<string, string | null>>;

function buildAssignments(guests: readonly ProSeatingGuest[]): AssignmentMap {
  return Object.fromEntries(guests.map((guest) => [guest.id, guest.tableId]));
}

function tableShapeClass(shape: TableShape): string {
  if (shape === 'round') return 'mx-auto aspect-square w-full max-w-56 rounded-full';
  if (shape === 'square') return 'mx-auto aspect-square w-full max-w-56 rounded-3xl';
  if (shape === 'banquet') return 'mx-auto min-h-44 w-full rounded-[2.5rem]';
  return 'mx-auto min-h-44 w-full rounded-[3rem]';
}

function stateGuest(
  guest: ProSeatingGuest,
  assignments: AssignmentMap,
  tableById: ReadonlyMap<string, ProSeatingTable>,
): ProSeatingGuest {
  const tableId = assignments[guest.id] ?? null;
  const table = tableId === null ? undefined : tableById.get(tableId);
  return {
    ...guest,
    tableId,
    tableName: table?.name ?? null,
  };
}

function Result({ state }: { state: ProSeatingState }) {
  if (state.status === 'idle') return null;
  return (
    <Alert tone={state.status === 'success' ? 'success' : 'error'}>
      <p>{state.message}</p>
    </Alert>
  );
}

function GuestChip({
  guest,
  selected,
  onSelect,
}: {
  guest: ProSeatingGuest;
  selected: boolean;
  onSelect: (guestId: string) => void;
}) {
  return (
    <button
      type="button"
      draggable={!guest.seatLocked}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', guest.id);
      }}
      onClick={() => onSelect(guest.id)}
      className={`group flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-start transition ${
        selected
          ? 'border-primary bg-primary text-primary-foreground shadow-lg'
          : 'border-border bg-card hover:border-primary/50 hover:shadow-md'
      } ${guest.seatLocked ? 'cursor-not-allowed opacity-75' : 'cursor-grab active:cursor-grabbing'}`}
      aria-pressed={selected}
      aria-label={`${guest.fullName}, ${guest.partySize} מקומות${guest.seatLocked ? ', מקום נעול' : ''}`}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{guest.fullName}</span>
        <span
          className={`mt-0.5 block truncate text-xs ${selected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
        >
          {guest.seatingGroup ?? guest.familySide ?? 'ללא קבוצה'}
        </span>
      </span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
          selected ? 'bg-primary-foreground/15' : 'bg-secondary'
        }`}
      >
        {guest.partySize}
      </span>
    </button>
  );
}

export function VisualSeatingFloor({
  eventId,
  guests,
  tables,
}: {
  eventId: string;
  guests: readonly ProSeatingGuest[];
  tables: readonly ProSeatingTable[];
}) {
  const [saveState, saveAction, saving] = useActionState(saveProGuestSeatingAction, INITIAL);
  const [assignments, setAssignments] = useState<AssignmentMap>(() => buildAssignments(guests));
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');

  const guestById = useMemo(
    () => new Map(guests.map((guest) => [guest.id, guest] as const)),
    [guests],
  );
  const tableById = useMemo(
    () => new Map(tables.map((table) => [table.id, table] as const)),
    [tables],
  );
  const liveGuests = useMemo(
    () => guests.map((guest) => stateGuest(guest, assignments, tableById)),
    [assignments, guests, tableById],
  );
  const analytics = useMemo(
    () => getSeatingAnalytics(tables, liveGuests),
    [liveGuests, tables],
  );
  const occupancyById = useMemo(
    () => new Map(analytics.tables.map((table) => [table.id, table] as const)),
    [analytics.tables],
  );
  const guestsByTable = useMemo(() => {
    const result = new Map<string, ProSeatingGuest[]>();
    for (const guest of liveGuests) {
      if (guest.tableId === null) continue;
      const current = result.get(guest.tableId) ?? [];
      current.push(guest);
      result.set(guest.tableId, current);
    }
    return result;
  }, [liveGuests]);
  const normalizedQuery = query.trim().toLocaleLowerCase('he');
  const unassignedGuests = liveGuests.filter((guest) => {
    if (guest.tableId !== null) return false;
    if (normalizedQuery === '') return true;
    return [guest.fullName, guest.seatingGroup, guest.familySide]
      .filter((value): value is string => value !== null)
      .join(' ')
      .toLocaleLowerCase('he')
      .includes(normalizedQuery);
  });
  const zones = useMemo(() => {
    const values = new Set(tables.map((table) => table.zone?.trim() || 'מרכז האולם'));
    return [...values];
  }, [tables]);

  function assignGuest(guestId: string, targetTableId: string | null): void {
    const guest = guestById.get(guestId);
    if (guest === undefined) return;
    if (guest.seatLocked) {
      setAnnouncement(`${guest.fullName} נעול ולא ניתן להזזה.`);
      return;
    }

    if (targetTableId !== null) {
      const table = occupancyById.get(targetTableId);
      if (table === undefined) return;
      const currentTableId = assignments[guestId] ?? null;
      const currentOccupancy =
        table.occupied - (currentTableId === targetTableId ? guest.partySize : 0);
      if (currentOccupancy + guest.partySize > table.capacity) {
        setAnnouncement(
          `אין מספיק מקום ב${table.name}. נדרשים ${guest.partySize} מקומות ונשארו ${Math.max(0, table.capacity - currentOccupancy)}.`,
        );
        return;
      }
    }

    setAssignments((current) => ({ ...current, [guestId]: targetTableId }));
    setSelectedGuestId(null);
    const targetName = targetTableId === null ? 'רשימת הלא משובצים' : tableById.get(targetTableId)?.name;
    setAnnouncement(`${guest.fullName} הועבר אל ${targetName ?? 'השולחן שנבחר'}.`);
  }

  function handleDrop(event: DragEvent<HTMLElement>, targetTableId: string | null): void {
    event.preventDefault();
    const guestId = event.dataTransfer.getData('text/plain');
    if (guestId !== '') assignGuest(guestId, targetTableId);
  }

  function chooseDestination(targetTableId: string | null): void {
    if (selectedGuestId === null) {
      setAnnouncement('בחרו קודם מוזמן מהרשימה או מתוך שולחן.');
      return;
    }
    assignGuest(selectedGuestId, targetTableId);
  }

  if (tables.length === 0) return null;

  return (
    <Card padding="none" className="overflow-hidden border-2 border-primary/15 shadow-xl">
      <div className="bg-primary px-5 py-6 text-primary-foreground sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-primary-foreground/70">LIVE FLOOR</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">מפת האולם החיה</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-primary-foreground/80 sm:text-base">
              גוררים מוזמנים לשולחנות, או לוחצים על מוזמן ואז על שולחן. המערכת מונעת חריגת קיבולת
              ושומרת מקומות נעולים.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-primary-foreground/10 px-3 py-2">
              <p className="text-2xl font-black tabular-nums">{analytics.assignedPeople}</p>
              <p className="text-[11px] text-primary-foreground/70">משובצים</p>
            </div>
            <div className="rounded-2xl bg-primary-foreground/10 px-3 py-2">
              <p className="text-2xl font-black tabular-nums">{analytics.unassignedPeople}</p>
              <p className="text-[11px] text-primary-foreground/70">ממתינים</p>
            </div>
            <div className="rounded-2xl bg-primary-foreground/10 px-3 py-2">
              <p className="text-2xl font-black tabular-nums">{analytics.emptySeats}</p>
              <p className="text-[11px] text-primary-foreground/70">פנויים</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-[720px] lg:grid-cols-[320px_1fr]">
        <aside
          className="border-border bg-secondary/25 border-b p-4 lg:border-e lg:border-b-0"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop(event, null)}
        >
          <div className="sticky top-4 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold tracking-[0.18em] text-accent-strong">WAITING LIST</p>
                  <h3 className="text-primary mt-1 text-xl font-black">טרם שובצו</h3>
                </div>
                <span className="bg-card border-border rounded-full border px-3 py-1 text-sm font-bold tabular-nums">
                  {unassignedGuests.length}
                </span>
              </div>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="mt-3"
                placeholder="חיפוש משפחה או קבוצה"
                aria-label="חיפוש מוזמנים שלא שובצו"
              />
            </div>

            <button
              type="button"
              onClick={() => chooseDestination(null)}
              className="border-border-strong bg-card text-primary w-full rounded-2xl border border-dashed px-4 py-3 text-sm font-bold hover:border-primary"
            >
              החזרת המוזמן הנבחר ללא משובצים
            </button>

            <div className="max-h-[520px] space-y-2 overflow-y-auto pe-1">
              {unassignedGuests.length === 0 ? (
                <div className="border-border bg-card rounded-3xl border p-6 text-center">
                  <p className="text-4xl" aria-hidden="true">✓</p>
                  <p className="text-primary mt-3 font-bold">כולם שובצו</p>
                  <p className="text-muted-foreground mt-1 text-xs">האולם מוכן לבדיקה ולשמירה.</p>
                </div>
              ) : (
                unassignedGuests.map((guest) => (
                  <GuestChip
                    key={guest.id}
                    guest={guest}
                    selected={selectedGuestId === guest.id}
                    onSelect={setSelectedGuestId}
                  />
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="bg-card p-4 sm:p-6 lg:p-8">
          <div className="border-border bg-secondary/20 mb-6 rounded-[2rem] border p-4 text-center">
            <div className="bg-primary text-primary-foreground mx-auto max-w-xl rounded-2xl px-6 py-3 font-black shadow-lg">
              במה · חופה · שולחן כבוד
            </div>
            <div className="border-border bg-card text-muted-foreground mx-auto mt-4 max-w-sm rounded-full border border-dashed px-6 py-3 text-sm font-bold">
              רחבת ריקודים
            </div>
          </div>

          <p className="sr-only" aria-live="polite">{announcement}</p>
          {announcement !== '' && (
            <div className="border-border bg-secondary/35 text-primary mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold">
              {announcement}
            </div>
          )}

          <div className="space-y-8">
            {zones.map((zone) => (
              <section key={zone} aria-labelledby={`zone-${zone}`}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="bg-accent h-2.5 w-2.5 rounded-full" aria-hidden="true" />
                  <h3 id={`zone-${zone}`} className="text-primary text-lg font-black">{zone}</h3>
                  <span className="bg-border h-px flex-1" aria-hidden="true" />
                </div>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {tables
                    .filter((table) => (table.zone?.trim() || 'מרכז האולם') === zone)
                    .map((table) => {
                      const occupancy = occupancyById.get(table.id);
                      const tableGuests = guestsByTable.get(table.id) ?? [];
                      const occupied = occupancy?.occupied ?? 0;
                      const remaining = occupancy?.remaining ?? table.capacity;
                      const fill = Math.min(100, (occupied / table.capacity) * 100);
                      const isDestination = selectedGuestId !== null;
                      return (
                        <article
                          key={table.id}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => handleDrop(event, table.id)}
                          className={`relative overflow-hidden rounded-[2rem] border p-4 transition ${
                            isDestination
                              ? 'border-primary shadow-lg ring-2 ring-primary/10'
                              : 'border-border hover:border-primary/40 hover:shadow-lg'
                          } ${occupancy?.overCapacity ? 'border-destructive ring-destructive/20' : ''}`}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-muted-foreground text-[11px] font-bold tracking-[0.16em]">
                                {TABLE_SHAPE_LABELS[table.shape]}
                              </p>
                              <h4 className="text-primary mt-1 text-xl font-black">{table.name}</h4>
                            </div>
                            <div className="text-end">
                              <p className="text-primary text-2xl font-black tabular-nums">
                                {occupied}/{table.capacity}
                              </p>
                              <p className="text-muted-foreground text-[11px]">{remaining} פנויים</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => chooseDestination(table.id)}
                            className={`${tableShapeClass(table.shape)} border-border bg-secondary/40 relative flex flex-col items-center justify-center border-2 p-4 text-center shadow-inner transition hover:border-primary`}
                            aria-label={`שיבוץ המוזמן הנבחר אל ${table.name}`}
                          >
                            <span className="text-primary text-lg font-black">{table.name}</span>
                            <span className="text-muted-foreground mt-1 text-xs">
                              {tableGuests.length} משפחות · {occupied} אורחים
                            </span>
                            {selectedGuestId !== null && (
                              <span className="bg-primary text-primary-foreground mt-3 rounded-full px-3 py-1 text-xs font-bold">
                                שיבוץ לכאן
                              </span>
                            )}
                          </button>

                          <div className="bg-secondary mt-4 h-2 overflow-hidden rounded-full">
                            <div
                              className={`h-full rounded-full ${occupancy?.overCapacity ? 'bg-destructive' : 'bg-primary'}`}
                              style={{ width: `${fill}%` }}
                            />
                          </div>

                          <div className="mt-4 space-y-2">
                            {tableGuests.length === 0 ? (
                              <p className="border-border text-muted-foreground rounded-2xl border border-dashed px-3 py-4 text-center text-xs">
                                גררו לכאן משפחה
                              </p>
                            ) : (
                              tableGuests.map((guest) => (
                                <GuestChip
                                  key={guest.id}
                                  guest={guest}
                                  selected={selectedGuestId === guest.id}
                                  onSelect={setSelectedGuestId}
                                />
                              ))
                            )}
                          </div>

                          {table.notes !== null && (
                            <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{table.notes}</p>
                          )}
                        </article>
                      );
                    })}
                </div>
              </section>
            ))}
          </div>
        </section>
      </div>

      <form action={saveAction} className="border-border bg-card border-t p-5 sm:p-6">
        <input type="hidden" name="eventId" value={eventId} />
        {liveGuests.map((guest) => (
          <div key={guest.id}>
            <input type="hidden" name="guestId" value={guest.id} />
            <input type="hidden" name="guestTableId" value={guest.tableId ?? ''} />
            <input type="hidden" name="guestSeatNumber" value={guest.seatNumber ?? ''} />
            <input type="hidden" name="guestGroup" value={guest.seatingGroup ?? ''} />
            <input type="hidden" name="guestMeal" value={guest.mealPreference ?? ''} />
            <input
              type="hidden"
              name="guestAccessibility"
              value={guest.accessibilityNeeds ?? ''}
            />
            <input type="hidden" name="guestPriority" value={String(guest.priority)} />
            <input type="hidden" name="guestLocked" value={guest.seatLocked ? 'true' : 'false'} />
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-primary font-black">הסידור נשמר רק בלחיצה</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {analytics.assignedPeople} משובצים · {analytics.unassignedPeople} ללא שולחן ·{' '}
              {analytics.emptySeats} מקומות פנויים
            </p>
          </div>
          <Button type="submit" disabled={saving} className="min-w-48">
            {saving ? 'שומר את האולם…' : 'שמירת מפת האולם'}
          </Button>
        </div>
        <div className="mt-4">
          <Result state={saveState} />
        </div>
      </form>
    </Card>
  );
}
