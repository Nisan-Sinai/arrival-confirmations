'use client';

import { useActionState, useMemo, useState } from 'react';
import type { DragEvent } from 'react';

import { saveProGuestSeatingAction, type ProSeatingState } from '@/app/actions/manageProSeating';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';
import {
  getSeatingAnalytics,
  getTableShapeLabels,
  type ProSeatingGuest,
  type ProSeatingTable,
  type TableShape,
} from '@/lib/proSeating';

const INITIAL: ProSeatingState = { status: 'idle', message: '' };

type AssignmentMap = Readonly<Record<string, string | null>>;

const COPY = {
  he: {
    places: 'מקומות',
    lockedPlace: 'מקום נעול',
    noGroup: 'ללא קבוצה',
    hallCenter: 'מרכז האולם',
    lockedAnnouncement: (name: string) => `${name} נעול ולא ניתן להזזה.`,
    noCapacity: (table: string, needed: number, remaining: number) =>
      `אין מספיק מקום ב${table}. נדרשים ${needed} מקומות ונשארו ${remaining}.`,
    unassignedList: 'רשימת הלא משובצים',
    selectedTable: 'השולחן שנבחר',
    moved: (name: string, destination: string) => `${name} הועבר אל ${destination}.`,
    selectFirst: 'בחרו קודם מוזמן מהרשימה או מתוך שולחן.',
    eyebrow: 'מפה חיה',
    title: 'מפת האולם החיה',
    intro: 'גוררים מוזמנים לשולחנות, או לוחצים על מוזמן ואז על שולחן. המערכת מונעת חריגת קיבולת ושומרת מקומות נעולים.',
    assigned: 'משובצים',
    waiting: 'ממתינים',
    free: 'פנויים',
    waitingAria: 'רשימת מוזמנים שטרם שובצו',
    waitingEyebrow: 'רשימת המתנה',
    waitingTitle: 'טרם שובצו',
    searchPlaceholder: 'חיפוש משפחה או קבוצה',
    searchAria: 'חיפוש מוזמנים שלא שובצו',
    returnUnassigned: 'החזרת המוזמן הנבחר ללא משובצים',
    allAssigned: 'כולם שובצו',
    ready: 'האולם מוכן לבדיקה ולשמירה.',
    floorAria: 'מפת שולחנות באולם',
    stage: 'במה · חופה · שולחן כבוד',
    danceFloor: 'רחבת ריקודים',
    remaining: (count: number) => `${count} פנויים`,
    assignTo: (name: string) => `שיבוץ המוזמן הנבחר אל ${name}`,
    familiesGuests: (families: number, guests: number) => `${families} משפחות · ${guests} אורחים`,
    assignHere: 'שיבוץ לכאן',
    dragFamily: 'גררו לכאן משפחה',
    saveOnlyOnClick: 'הסידור נשמר רק בלחיצה',
    summary: (assigned: number, unassigned: number, free: number) =>
      `${assigned} משובצים · ${unassigned} ללא שולחן · ${free} מקומות פנויים`,
    saving: 'שומר את האולם…',
    save: 'שמירת מפת האולם',
  },
  en: {
    places: 'seats',
    lockedPlace: 'locked seat',
    noGroup: 'No group',
    hallCenter: 'Main hall',
    lockedAnnouncement: (name: string) => `${name} is locked and cannot be moved.`,
    noCapacity: (table: string, needed: number, remaining: number) =>
      `${table} does not have enough room. ${needed} seats are needed and ${remaining} remain.`,
    unassignedList: 'the unassigned list',
    selectedTable: 'the selected table',
    moved: (name: string, destination: string) => `${name} was moved to ${destination}.`,
    selectFirst: 'Select a guest from the list or a table first.',
    eyebrow: 'Live floor',
    title: 'Live venue map',
    intro: 'Drag guests onto tables, or select a guest and then a table. The system prevents capacity overflow and preserves locked seats.',
    assigned: 'Assigned',
    waiting: 'Waiting',
    free: 'Free',
    waitingAria: 'Guests who have not been assigned yet',
    waitingEyebrow: 'Waiting list',
    waitingTitle: 'Not assigned yet',
    searchPlaceholder: 'Search family or group',
    searchAria: 'Search unassigned guests',
    returnUnassigned: 'Return selected guest to unassigned',
    allAssigned: 'Everyone is assigned',
    ready: 'The venue is ready to review and save.',
    floorAria: 'Venue table map',
    stage: 'Stage · chuppah · head table',
    danceFloor: 'Dance floor',
    remaining: (count: number) => `${count} free`,
    assignTo: (name: string) => `Assign the selected guest to ${name}`,
    familiesGuests: (families: number, guests: number) => `${families} families · ${guests} guests`,
    assignHere: 'Assign here',
    dragFamily: 'Drag a family here',
    saveOnlyOnClick: 'Changes are saved only when you click Save',
    summary: (assigned: number, unassigned: number, free: number) =>
      `${assigned} assigned · ${unassigned} without a table · ${free} free seats`,
    saving: 'Saving venue…',
    save: 'Save venue map',
  },
} as const;

function buildAssignments(guests: readonly ProSeatingGuest[]): AssignmentMap {
  return Object.fromEntries(guests.map((guest) => [guest.id, guest.tableId]));
}

function tableShapeClass(shape: TableShape): string {
  if (shape === 'round') return 'mx-auto aspect-square w-full max-w-56 rounded-full';
  if (shape === 'square') return 'mx-auto aspect-square w-full max-w-56 rounded-3xl';
  if (shape === 'banquet') return 'mx-auto min-h-44 w-full rounded-[2.5rem]';
  return 'mx-auto min-h-44 w-full rounded-[3rem]';
}

function withLiveAssignment(
  guest: ProSeatingGuest,
  assignments: AssignmentMap,
  tableById: ReadonlyMap<string, ProSeatingTable>,
): ProSeatingGuest {
  const tableId = assignments[guest.id] ?? null;
  const table = tableId === null ? undefined : tableById.get(tableId);
  return { ...guest, tableId, tableName: table?.name ?? null };
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
  placesLabel,
  lockedLabel,
  noGroupLabel,
}: {
  guest: ProSeatingGuest;
  selected: boolean;
  onSelect: (guestId: string) => void;
  placesLabel: string;
  lockedLabel: string;
  noGroupLabel: string;
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
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-start transition ${
        selected
          ? 'border-primary bg-primary text-primary-foreground shadow-lg'
          : 'border-border bg-card hover:border-primary/50 hover:shadow-md'
      } ${guest.seatLocked ? 'cursor-not-allowed opacity-75' : 'cursor-grab active:cursor-grabbing'}`}
      aria-pressed={selected}
      aria-label={`${guest.fullName}, ${guest.partySize} ${placesLabel}${guest.seatLocked ? `, ${lockedLabel}` : ''}`}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{guest.fullName}</span>
        <span
          className={`mt-0.5 block truncate text-xs ${selected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
        >
          {guest.seatingGroup ?? guest.familySide ?? noGroupLabel}
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
  const locale = useAppLocale();
  const copy = COPY[locale];
  const shapeLabels = getTableShapeLabels(locale);
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
    () => guests.map((guest) => withLiveAssignment(guest, assignments, tableById)),
    [assignments, guests, tableById],
  );
  const analytics = useMemo(() => getSeatingAnalytics(tables, liveGuests), [liveGuests, tables]);
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
  const zones = useMemo(
    () => [...new Set(tables.map((table) => table.zone?.trim() || copy.hallCenter))],
    [copy.hallCenter, tables],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase(locale === 'he' ? 'he' : 'en');
  const unassignedGuests = liveGuests.filter((guest) => {
    if (guest.tableId !== null) return false;
    if (normalizedQuery === '') return true;
    return [guest.fullName, guest.seatingGroup, guest.familySide]
      .filter((value): value is string => value !== null)
      .join(' ')
      .toLocaleLowerCase(locale === 'he' ? 'he' : 'en')
      .includes(normalizedQuery);
  });

  function assignGuest(guestId: string, targetTableId: string | null): void {
    const guest = guestById.get(guestId);
    if (guest === undefined) return;
    if (guest.seatLocked) {
      setAnnouncement(copy.lockedAnnouncement(guest.fullName));
      return;
    }

    if (targetTableId !== null) {
      const table = occupancyById.get(targetTableId);
      if (table === undefined) return;
      const currentTableId = assignments[guestId] ?? null;
      const occupiedWithoutGuest =
        table.occupied - (currentTableId === targetTableId ? guest.partySize : 0);
      const remaining = Math.max(0, table.capacity - occupiedWithoutGuest);
      if (guest.partySize > remaining) {
        setAnnouncement(copy.noCapacity(table.name, guest.partySize, remaining));
        return;
      }
    }

    setAssignments((current) => ({ ...current, [guestId]: targetTableId }));
    setSelectedGuestId(null);
    const targetName =
      targetTableId === null ? copy.unassignedList : tableById.get(targetTableId)?.name;
    setAnnouncement(copy.moved(guest.fullName, targetName ?? copy.selectedTable));
  }

  function handleDrop(event: DragEvent<HTMLElement>, targetTableId: string | null): void {
    event.preventDefault();
    const guestId = event.dataTransfer.getData('text/plain');
    if (guestId !== '') assignGuest(guestId, targetTableId);
  }

  function chooseDestination(targetTableId: string | null): void {
    if (selectedGuestId === null) {
      setAnnouncement(copy.selectFirst);
      return;
    }
    assignGuest(selectedGuestId, targetTableId);
  }

  if (tables.length === 0) return null;

  return (
    <Card padding="none" className="border-primary/15 overflow-hidden border-2 shadow-xl">
      <div className="bg-primary text-primary-foreground px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-primary-foreground/70 text-xs font-bold tracking-[0.22em]">
              {copy.eyebrow}
            </p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">{copy.title}</h2>
            <p className="text-primary-foreground/80 mt-3 max-w-3xl text-sm leading-relaxed sm:text-base">
              {copy.intro}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-primary-foreground/10 rounded-2xl px-3 py-2">
              <p className="text-2xl font-black tabular-nums">{analytics.assignedPeople}</p>
              <p className="text-primary-foreground/70 text-[11px]">{copy.assigned}</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-2xl px-3 py-2">
              <p className="text-2xl font-black tabular-nums">{analytics.unassignedPeople}</p>
              <p className="text-primary-foreground/70 text-[11px]">{copy.waiting}</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-2xl px-3 py-2">
              <p className="text-2xl font-black tabular-nums">{analytics.emptySeats}</p>
              <p className="text-primary-foreground/70 text-[11px]">{copy.free}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-[720px] lg:grid-cols-[320px_1fr]">
        <aside
          className="border-border bg-secondary/25 border-b p-4 lg:border-e lg:border-b-0"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop(event, null)}
          aria-label={copy.waitingAria}
        >
          <div className="sticky top-4 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-accent-strong text-xs font-bold tracking-[0.18em]">
                    {copy.waitingEyebrow}
                  </p>
                  <h3 className="text-primary mt-1 text-xl font-black">{copy.waitingTitle}</h3>
                </div>
                <span className="bg-card border-border rounded-full border px-3 py-1 text-sm font-bold tabular-nums">
                  {unassignedGuests.length}
                </span>
              </div>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="mt-3"
                placeholder={copy.searchPlaceholder}
                aria-label={copy.searchAria}
              />
            </div>

            <button
              type="button"
              onClick={() => chooseDestination(null)}
              className="border-border-strong bg-card text-primary hover:border-primary w-full rounded-2xl border border-dashed px-4 py-3 text-sm font-bold"
            >
              {copy.returnUnassigned}
            </button>

            <div className="max-h-[520px] space-y-2 overflow-y-auto pe-1">
              {unassignedGuests.length === 0 ? (
                <div className="border-border bg-card rounded-3xl border p-6 text-center">
                  <p className="text-4xl" aria-hidden="true">
                    ✓
                  </p>
                  <p className="text-primary mt-3 font-bold">{copy.allAssigned}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{copy.ready}</p>
                </div>
              ) : (
                unassignedGuests.map((guest) => (
                  <GuestChip
                    key={guest.id}
                    guest={guest}
                    selected={selectedGuestId === guest.id}
                    onSelect={setSelectedGuestId}
                    placesLabel={copy.places}
                    lockedLabel={copy.lockedPlace}
                    noGroupLabel={copy.noGroup}
                  />
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="bg-card p-4 sm:p-6 lg:p-8" aria-label={copy.floorAria}>
          <div className="border-border bg-secondary/20 mb-6 rounded-[2rem] border p-4 text-center">
            <div className="bg-primary text-primary-foreground mx-auto max-w-xl rounded-2xl px-6 py-3 font-black shadow-lg">
              {copy.stage}
            </div>
            <div className="border-border bg-card text-muted-foreground mx-auto mt-4 max-w-sm rounded-full border border-dashed px-6 py-3 text-sm font-bold">
              {copy.danceFloor}
            </div>
          </div>

          <p className="sr-only" aria-live="polite">
            {announcement}
          </p>
          {announcement !== '' && (
            <div className="border-border bg-secondary/35 text-primary mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold">
              {announcement}
            </div>
          )}

          <div className="space-y-8">
            {zones.map((zone, zoneIndex) => (
              <section key={zone} aria-labelledby={`seating-zone-${zoneIndex}`}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="bg-accent h-2.5 w-2.5 rounded-full" aria-hidden="true" />
                  <h3 id={`seating-zone-${zoneIndex}`} className="text-primary text-lg font-black">
                    {zone}
                  </h3>
                  <span className="bg-border h-px flex-1" aria-hidden="true" />
                </div>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {tables
                    .filter((table) => (table.zone?.trim() || copy.hallCenter) === zone)
                    .map((table) => {
                      const occupancy = occupancyById.get(table.id);
                      const tableGuests = guestsByTable.get(table.id) ?? [];
                      const occupied = occupancy?.occupied ?? 0;
                      const remaining = occupancy?.remaining ?? table.capacity;
                      const fill = Math.min(100, (occupied / table.capacity) * 100);
                      return (
                        <article
                          key={table.id}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => handleDrop(event, table.id)}
                          className={`relative overflow-hidden rounded-[2rem] border p-4 transition ${
                            selectedGuestId === null
                              ? 'border-border hover:border-primary/40 hover:shadow-lg'
                              : 'border-primary ring-primary/10 shadow-lg ring-2'
                          } ${occupancy?.overCapacity ? 'border-destructive ring-destructive/20' : ''}`}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-muted-foreground text-[11px] font-bold tracking-[0.16em]">
                                {shapeLabels[table.shape]}
                              </p>
                              <h4 className="text-primary mt-1 text-xl font-black">{table.name}</h4>
                            </div>
                            <div className="text-end">
                              <p className="text-primary text-2xl font-black tabular-nums">
                                {occupied}/{table.capacity}
                              </p>
                              <p className="text-muted-foreground text-[11px]">
                                {copy.remaining(remaining)}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => chooseDestination(table.id)}
                            className={`${tableShapeClass(table.shape)} border-border bg-secondary/40 hover:border-primary relative flex flex-col items-center justify-center border-2 p-4 text-center shadow-inner transition`}
                            aria-label={copy.assignTo(table.name)}
                          >
                            <span className="text-primary text-lg font-black">{table.name}</span>
                            <span className="text-muted-foreground mt-1 text-xs">
                              {copy.familiesGuests(tableGuests.length, occupied)}
                            </span>
                            {selectedGuestId !== null && (
                              <span className="bg-primary text-primary-foreground mt-3 rounded-full px-3 py-1 text-xs font-bold">
                                {copy.assignHere}
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
                                {copy.dragFamily}
                              </p>
                            ) : (
                              tableGuests.map((guest) => (
                                <GuestChip
                                  key={guest.id}
                                  guest={guest}
                                  selected={selectedGuestId === guest.id}
                                  onSelect={setSelectedGuestId}
                                  placesLabel={copy.places}
                                  lockedLabel={copy.lockedPlace}
                                  noGroupLabel={copy.noGroup}
                                />
                              ))
                            )}
                          </div>

                          {table.notes !== null && (
                            <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                              {table.notes}
                            </p>
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
        <input type="hidden" name="locale" value={locale} />
        {liveGuests.map((guest) => (
          <div key={guest.id}>
            <input type="hidden" name="guestId" value={guest.id} />
            <input type="hidden" name="guestTableId" value={guest.tableId ?? ''} />
            <input type="hidden" name="guestSeatNumber" value={guest.seatNumber ?? ''} />
            <input type="hidden" name="guestGroup" value={guest.seatingGroup ?? ''} />
            <input type="hidden" name="guestMeal" value={guest.mealPreference ?? ''} />
            <input type="hidden" name="guestAccessibility" value={guest.accessibilityNeeds ?? ''} />
            <input type="hidden" name="guestPriority" value={String(guest.priority)} />
            <input type="hidden" name="guestLocked" value={guest.seatLocked ? 'true' : 'false'} />
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-primary font-black">{copy.saveOnlyOnClick}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {copy.summary(
                analytics.assignedPeople,
                analytics.unassignedPeople,
                analytics.emptySeats,
              )}
            </p>
          </div>
          <Button type="submit" disabled={saving} className="min-w-48">
            {saving ? copy.saving : copy.save}
          </Button>
        </div>
        <div className="mt-4">
          <Result state={saveState} />
        </div>
      </form>
    </Card>
  );
}
