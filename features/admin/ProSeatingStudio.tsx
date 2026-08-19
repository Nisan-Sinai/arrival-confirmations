'use client';

import { useActionState, useMemo, useState } from 'react';

import {
  autoSeatGuestsAction,
  clearUnlockedSeatingAction,
  saveProGuestSeatingAction,
  saveProTablesAction,
  saveSeatingSnapshotAction,
  type ProSeatingState,
} from '@/app/actions/manageProSeating';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';
import {
  buildSeatingCsv,
  getSeatingAnalytics,
  getTableShapeLabels,
  TABLE_SHAPES,
  type ProSeatingGuest,
  type ProSeatingTable,
} from '@/lib/proSeating';

const INITIAL: ProSeatingState = { status: 'idle', message: '' };

const COPY = {
  he: {
    title: 'סטודיו סידורי הושבה',
    intro: 'שולחנות אמיתיים עם קיבולת, אזורים וצורות; קבוצות ומשפחות; צרכי נגישות; העדפות אוכל; נעילת מקומות; הושבה אוטומטית, בדיקות חריגה, ייצוא והדפסה. הכול פועל בתוך המערכת ללא שירות חיצוני בתשלום.',
    export: 'ייצוא ל-Excel',
    exportName: 'סידור-הושבה.csv',
    print: 'הדפסה',
    metrics: [
      ['שולחנות', 'בכל האזורים'],
      ['קיבולת', 'מקומות זמינים'],
      ['משובצים', 'אנשים'],
      ['ללא שולחן', 'אנשים לטיפול'],
      ['מקומות פנויים', 'ללא חריגות'],
      ['מקומות נעולים', 'לא יזוזו אוטומטית'],
    ] as const,
    overCapacity: 'נמצאה חריגה בקיבולת:',
    smartActions: 'פעולות חכמות',
    smartTitle: 'הושבה, איפוס ונקודות שחזור',
    autoIntro: 'משבץ לפי קבוצות, צד, גודל משפחה ועדיפות. מקומות נעולים נשמרים.',
    autoBusy: 'מחשב הושבה…',
    auto: 'הושבה חכמה אוטומטית',
    clearIntro: 'מנקה את כל השיבוצים שאינם נעולים, בלי למחוק מוזמנים או שולחנות.',
    clearing: 'מאפס…',
    clear: 'איפוס מקומות לא נעולים',
    snapshotLabel: (count: number) => `נקודת שחזור · נשמרו ${count}`,
    snapshotPlaceholder: 'לדוגמה: גרסה לאישור האולם',
    saving: 'שומר…',
    saveSnapshot: 'שמירת מצב נוכחי',
    hallMap: 'מפת האולם',
    tablesTitle: 'שולחנות, קיבולת ואזורים',
    tablesIntro: 'אפשר לשנות את הסדר, הקיבולת והאזור. כדי למחוק שולחן קיים, מוחקים את שמו ושומרים; המוזמנים שהיו בו יחזרו לרשימת הלא משובצים.',
    records: 'רשומות',
    freeSeats: 'מקומות פנויים',
    tableName: 'שם שולחן',
    shape: 'צורה',
    capacity: 'קיבולת',
    zone: 'אזור',
    note: 'הערה',
    newTable: 'שולחן חדש',
    tableNameAria: 'שם שולחן',
    tableShapeAria: 'צורת שולחן',
    tableCapacityAria: 'קיבולת שולחן',
    tableZoneAria: 'אזור שולחן',
    tableNoteAria: 'הערת שולחן',
    zonePlaceholder: 'מרכז / משפחה / צעירים',
    notePlaceholder: 'קרוב לבמה, מעבר רחב…',
    savingTables: 'שומר שולחנות…',
    saveTables: 'שמירת מפת השולחנות',
    guests: 'מוזמנים',
    assignment: 'שיבוץ והעדפות',
    shown: (shown: number, total: number) => `מוצגים ${shown} מתוך ${total} מוזמנים.`,
    search: 'חיפוש מוזמן, קבוצה או שולחן',
    filter: 'סינון מוזמנים',
    all: 'כל המוזמנים',
    unassigned: 'ללא שולחן',
    locked: 'מקומות נעולים',
    accessibility: 'צרכי נגישות',
    noGuests: 'ייבאו מוזמנים כדי להתחיל לבנות הושבה.',
    noMatches: 'לא נמצאו מוזמנים לפי החיפוש והסינון.',
    guest: 'מוזמן',
    party: 'כמות',
    table: 'שולחן',
    seat: 'מושב',
    group: 'קבוצה',
    meal: 'אוכל',
    priority: 'עדיפות',
    lock: 'נעילה',
    noSide: 'ללא צד',
    noZone: 'ללא אזור',
    tableFor: 'שולחן עבור',
    noTable: 'ללא שולחן',
    seats: 'מקומות',
    seatFor: 'מושב עבור',
    groupPlaceholder: 'משפחה / חברים',
    groupFor: 'קבוצה עבור',
    mealPlaceholder: 'רגיל / צמחוני',
    mealFor: 'העדפת אוכל עבור',
    accessibilityPlaceholder: 'כיסא גלגלים / קרוב ליציאה',
    accessibilityFor: 'צרכי נגישות עבור',
    priorityFor: 'עדיפות עבור',
    lockFor: 'נעילת מקום עבור',
    no: 'לא',
    yes: 'כן',
    savingGuests: 'שומר הושבה…',
    saveGuests: (count: number) => `שמירת ${count} המוזמנים המוצגים`,
  },
  en: {
    title: 'Seating studio',
    intro: 'Real tables with capacity, zones and shapes; groups and families; accessibility needs; meal preferences; locked seats; automatic seating, capacity checks, export and printing. Everything runs inside the product with no paid external service.',
    export: 'Export to Excel',
    exportName: 'seating-plan.csv',
    print: 'Print',
    metrics: [
      ['Tables', 'across all zones'],
      ['Capacity', 'available seats'],
      ['Assigned', 'people'],
      ['No table', 'people to place'],
      ['Empty seats', 'excluding overflows'],
      ['Locked seats', 'will not move automatically'],
    ] as const,
    overCapacity: 'Capacity exceeded:',
    smartActions: 'Smart actions',
    smartTitle: 'Seat, reset and restore points',
    autoIntro: 'Assigns by group, side, family size and priority. Locked seats are preserved.',
    autoBusy: 'Calculating seating…',
    auto: 'Automatic smart seating',
    clearIntro: 'Clears all unlocked assignments without deleting guests or tables.',
    clearing: 'Resetting…',
    clear: 'Reset unlocked seats',
    snapshotLabel: (count: number) => `Restore point · ${count} saved`,
    snapshotPlaceholder: 'For example: venue approval version',
    saving: 'Saving…',
    saveSnapshot: 'Save current state',
    hallMap: 'Venue map',
    tablesTitle: 'Tables, capacity and zones',
    tablesIntro: 'Change order, capacity and zone. To delete an existing table, clear its name and save; its guests return to the unassigned list.',
    records: 'records',
    freeSeats: 'empty seats',
    tableName: 'Table name',
    shape: 'Shape',
    capacity: 'Capacity',
    zone: 'Zone',
    note: 'Note',
    newTable: 'New table',
    tableNameAria: 'Table name',
    tableShapeAria: 'Table shape',
    tableCapacityAria: 'Table capacity',
    tableZoneAria: 'Table zone',
    tableNoteAria: 'Table note',
    zonePlaceholder: 'Centre / family / friends',
    notePlaceholder: 'Near the stage, wide aisle…',
    savingTables: 'Saving tables…',
    saveTables: 'Save table map',
    guests: 'Guests',
    assignment: 'Assignment & preferences',
    shown: (shown: number, total: number) => `Showing ${shown} of ${total} guests.`,
    search: 'Search guest, group or table',
    filter: 'Filter guests',
    all: 'All guests',
    unassigned: 'No table',
    locked: 'Locked seats',
    accessibility: 'Accessibility needs',
    noGuests: 'Import guests to start building a seating plan.',
    noMatches: 'No guests match the search and filter.',
    guest: 'Guest',
    party: 'Party size',
    table: 'Table',
    seat: 'Seat',
    group: 'Group',
    meal: 'Meal',
    priority: 'Priority',
    lock: 'Lock',
    noSide: 'No side',
    noZone: 'No zone',
    tableFor: 'Table for',
    noTable: 'No table',
    seats: 'seats',
    seatFor: 'Seat for',
    groupPlaceholder: 'Family / friends',
    groupFor: 'Group for',
    mealPlaceholder: 'Regular / vegetarian',
    mealFor: 'Meal preference for',
    accessibilityPlaceholder: 'Wheelchair / near an exit',
    accessibilityFor: 'Accessibility needs for',
    priorityFor: 'Priority for',
    lockFor: 'Seat lock for',
    no: 'No',
    yes: 'Yes',
    savingGuests: 'Saving seating…',
    saveGuests: (count: number) => `Save ${count} shown guests`,
  },
} as const;

function Result({ state }: { state: ProSeatingState }) {
  if (state.status === 'idle') return null;
  return (
    <Alert tone={state.status === 'success' ? 'success' : 'error'}>
      <p>{state.message}</p>
      {state.details !== undefined && state.details.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-sm">
          {state.details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
      )}
    </Alert>
  );
}

function Metric({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Card padding="none" className="p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-primary mt-2 text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
    </Card>
  );
}

export function ProSeatingStudio({ eventId, guests, tables, snapshotCount }: { eventId: string; guests: readonly ProSeatingGuest[]; tables: readonly ProSeatingTable[]; snapshotCount: number }) {
  const locale = useAppLocale();
  const copy = COPY[locale];
  const shapeLabels = getTableShapeLabels(locale);
  const [tableState, tableAction, savingTables] = useActionState(saveProTablesAction, INITIAL);
  const [guestState, guestAction, savingGuests] = useActionState(saveProGuestSeatingAction, INITIAL);
  const [autoState, autoAction, autoSeating] = useActionState(autoSeatGuestsAction, INITIAL);
  const [clearState, clearAction, clearing] = useActionState(clearUnlockedSeatingAction, INITIAL);
  const [snapshotState, snapshotAction, savingSnapshot] = useActionState(saveSeatingSnapshotAction, INITIAL);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'locked' | 'accessibility'>('all');
  const analytics = useMemo(() => getSeatingAnalytics(tables, guests), [tables, guests]);
  const tableById = useMemo(() => new Map(tables.map((table) => [table.id, table] as const)), [tables]);
  const visibleGuests = useMemo(() => {
    const language = locale === 'he' ? 'he' : 'en';
    const normalizedQuery = query.trim().toLocaleLowerCase(language);
    return guests.filter((guest) => {
      const matchesQuery = normalizedQuery === '' || [guest.fullName, guest.seatingGroup, guest.familySide, guest.tableName]
        .filter((value): value is string => value !== null)
        .join(' ')
        .toLocaleLowerCase(language)
        .includes(normalizedQuery);
      if (!matchesQuery) return false;
      if (filter === 'unassigned') return guest.tableId === null;
      if (filter === 'locked') return guest.seatLocked;
      if (filter === 'accessibility') return guest.accessibilityNeeds !== null;
      return true;
    });
  }, [filter, guests, locale, query]);
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(buildSeatingCsv(guests, tables, locale))}`;
  const metricValues = [analytics.totalTables, analytics.totalCapacity, analytics.assignedPeople, analytics.unassignedPeople, analytics.emptySeats, analytics.lockedGuests] as const;

  return (
    <div className="space-y-6">
      <Card padding="lg" className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-eyebrow text-accent-strong font-semibold">Pro</p>
            <h2 className="text-h2 text-primary mt-2 font-bold">{copy.title}</h2>
            <p className="text-muted-foreground mt-3 max-w-3xl leading-relaxed">{copy.intro}</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <a href={csvHref} download={copy.exportName} className="border-border-strong text-primary rounded-xl border px-4 py-2 text-sm font-semibold">{copy.export}</a>
            <button type="button" onClick={() => window.print()} className="border-border-strong text-primary rounded-xl border px-4 py-2 text-sm font-semibold">{copy.print}</button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
          {copy.metrics.map(([label, hint], index) => <Metric key={label} label={label} value={metricValues[index] ?? 0} hint={hint} />)}
        </div>

        {analytics.overCapacityTables.length > 0 && (
          <Alert tone="error" className="mt-5">
            <p className="font-semibold">{copy.overCapacity}</p>
            <p className="mt-1 text-sm">{analytics.overCapacityTables.map((table) => `${table.name}: ${table.occupied}/${table.capacity}`).join(' · ')}</p>
          </Alert>
        )}
      </Card>

      <Card padding="lg" className="print:hidden">
        <p className="text-eyebrow text-accent-strong font-semibold">{copy.smartActions}</p>
        <h3 className="text-h3 text-primary mt-2 font-semibold">{copy.smartTitle}</h3>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <form action={autoAction} className="space-y-3">
            <input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="locale" value={locale} />
            <p className="text-muted-foreground text-sm leading-relaxed">{copy.autoIntro}</p>
            <Button type="submit" disabled={autoSeating || tables.length === 0}>{autoSeating ? copy.autoBusy : copy.auto}</Button>
            <Result state={autoState} />
          </form>
          <form action={clearAction} className="space-y-3">
            <input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="locale" value={locale} />
            <p className="text-muted-foreground text-sm leading-relaxed">{copy.clearIntro}</p>
            <Button type="submit" variant="outline" disabled={clearing}>{clearing ? copy.clearing : copy.clear}</Button>
            <Result state={clearState} />
          </form>
          <form action={snapshotAction} className="space-y-3">
            <input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="locale" value={locale} />
            <Field label={copy.snapshotLabel(snapshotCount)}><Input name="snapshotLabel" placeholder={copy.snapshotPlaceholder} maxLength={120} /></Field>
            <Button type="submit" variant="outline" disabled={savingSnapshot}>{savingSnapshot ? copy.saving : copy.saveSnapshot}</Button>
            <Result state={snapshotState} />
          </form>
        </div>
      </Card>

      <Card padding="lg">
        <p className="text-eyebrow text-accent-strong font-semibold">{copy.hallMap}</p>
        <h3 className="text-h3 text-primary mt-2 font-semibold">{copy.tablesTitle}</h3>
        <p className="text-muted-foreground mt-3 leading-relaxed print:hidden">{copy.tablesIntro}</p>

        {analytics.tables.length > 0 && (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {analytics.tables.map((table) => (
              <li key={table.id}>
                <Card padding="none" className={`h-full p-4 ${table.overCapacity ? 'border-destructive' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-primary font-semibold">{table.name}</p><p className="text-muted-foreground mt-1 text-xs">{shapeLabels[table.shape]}{table.zone === null ? '' : ` · ${table.zone}`}</p></div>
                    <span className="text-primary text-lg font-bold tabular-nums">{table.occupied}/{table.capacity}</span>
                  </div>
                  <div className="bg-secondary mt-3 h-2 overflow-hidden rounded-full"><div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, (table.occupied / table.capacity) * 100)}%` }} /></div>
                  <p className="text-muted-foreground mt-2 text-xs">{table.guestCount} {copy.records} · {table.remaining} {copy.freeSeats}</p>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <form action={tableAction} className="mt-6 space-y-4 print:hidden">
          <input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="locale" value={locale} />
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-secondary/35 text-muted-foreground"><tr><th className="px-3 py-3 text-start">{copy.tableName}</th><th className="px-3 py-3 text-start">{copy.shape}</th><th className="px-3 py-3 text-start">{copy.capacity}</th><th className="px-3 py-3 text-start">{copy.zone}</th><th className="px-3 py-3 text-start">{copy.note}</th></tr></thead>
              <tbody>
                {[...tables, null].map((table, index) => (
                  <tr key={table?.id ?? 'new-table'} className="border-border border-t">
                    <td className="px-3 py-2"><input type="hidden" name="tableId" value={table?.id ?? ''} /><Input name="tableName" defaultValue={table?.name ?? ''} placeholder={table === null ? copy.newTable : undefined} aria-label={`${copy.tableNameAria} ${index + 1}`} maxLength={80} /></td>
                    <td className="px-3 py-2"><Select name="tableShape" defaultValue={table?.shape ?? 'round'} aria-label={`${copy.tableShapeAria} ${index + 1}`}>{TABLE_SHAPES.map((shape) => <option key={shape} value={shape}>{shapeLabels[shape]}</option>)}</Select></td>
                    <td className="px-3 py-2"><Input name="tableCapacity" type="number" min={1} max={100} defaultValue={table?.capacity ?? 10} aria-label={`${copy.tableCapacityAria} ${index + 1}`} /></td>
                    <td className="px-3 py-2"><Input name="tableZone" defaultValue={table?.zone ?? ''} placeholder={copy.zonePlaceholder} aria-label={`${copy.tableZoneAria} ${index + 1}`} maxLength={80} /></td>
                    <td className="px-3 py-2"><Input name="tableNotes" defaultValue={table?.notes ?? ''} placeholder={copy.notePlaceholder} aria-label={`${copy.tableNoteAria} ${index + 1}`} maxLength={500} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="submit" disabled={savingTables}>{savingTables ? copy.savingTables : copy.saveTables}</Button>
          <Result state={tableState} />
        </form>
      </Card>

      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-eyebrow text-accent-strong font-semibold">{copy.guests}</p><h3 className="text-h3 text-primary mt-2 font-semibold">{copy.assignment}</h3><p className="text-muted-foreground mt-2 text-sm">{copy.shown(visibleGuests.length, guests.length)}</p></div>
          <div className="grid gap-3 sm:grid-cols-2 print:hidden">
            <label className="text-sm font-medium"><span className="sr-only">{copy.search}</span><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} /></label>
            <label className="text-sm font-medium"><span className="sr-only">{copy.filter}</span><Select value={filter} onChange={(event) => setFilter(event.target.value as 'all' | 'unassigned' | 'locked' | 'accessibility')}><option value="all">{copy.all}</option><option value="unassigned">{copy.unassigned}</option><option value="locked">{copy.locked}</option><option value="accessibility">{copy.accessibility}</option></Select></label>
          </div>
        </div>

        {guests.length === 0 ? <p className="text-muted-foreground mt-6">{copy.noGuests}</p> : visibleGuests.length === 0 ? <p className="text-muted-foreground mt-6">{copy.noMatches}</p> : (
          <form action={guestAction} className="mt-6 space-y-4">
            <input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="locale" value={locale} />
            <div className="border-border overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[1500px] text-sm">
                <thead className="bg-secondary/35 text-muted-foreground"><tr><th className="px-3 py-3 text-start">{copy.guest}</th><th className="px-3 py-3 text-start">{copy.party}</th><th className="px-3 py-3 text-start">{copy.table}</th><th className="px-3 py-3 text-start">{copy.seat}</th><th className="px-3 py-3 text-start">{copy.group}</th><th className="px-3 py-3 text-start">{copy.meal}</th><th className="px-3 py-3 text-start">{copy.accessibility}</th><th className="px-3 py-3 text-start">{copy.priority}</th><th className="px-3 py-3 text-start">{copy.lock}</th></tr></thead>
                <tbody>{visibleGuests.map((guest) => {
                  const assignedTable = guest.tableId === null ? undefined : tableById.get(guest.tableId);
                  return <tr key={guest.id} className="border-border border-t align-top">
                    <td className="px-3 py-3 font-medium">{guest.fullName}<input type="hidden" name="guestId" value={guest.id} /><p className="text-muted-foreground mt-1 text-xs">{guest.familySide ?? copy.noSide}{assignedTable?.zone === undefined ? '' : ` · ${assignedTable.zone ?? copy.noZone}`}</p></td>
                    <td className="px-3 py-3 tabular-nums">{guest.partySize}</td>
                    <td className="px-3 py-2"><Select name="guestTableId" defaultValue={guest.tableId ?? ''} aria-label={`${copy.tableFor} ${guest.fullName}`}><option value="">{copy.noTable}</option>{tables.map((table) => <option key={table.id} value={table.id}>{table.name} · {table.capacity} {copy.seats}</option>)}</Select></td>
                    <td className="px-3 py-2"><Input name="guestSeatNumber" defaultValue={guest.seatNumber ?? ''} aria-label={`${copy.seatFor} ${guest.fullName}`} maxLength={40} /></td>
                    <td className="px-3 py-2"><Input name="guestGroup" defaultValue={guest.seatingGroup ?? ''} placeholder={copy.groupPlaceholder} aria-label={`${copy.groupFor} ${guest.fullName}`} maxLength={120} /></td>
                    <td className="px-3 py-2"><Input name="guestMeal" defaultValue={guest.mealPreference ?? ''} placeholder={copy.mealPlaceholder} aria-label={`${copy.mealFor} ${guest.fullName}`} maxLength={120} /></td>
                    <td className="px-3 py-2"><Input name="guestAccessibility" defaultValue={guest.accessibilityNeeds ?? ''} placeholder={copy.accessibilityPlaceholder} aria-label={`${copy.accessibilityFor} ${guest.fullName}`} maxLength={500} /></td>
                    <td className="px-3 py-2"><Select name="guestPriority" defaultValue={String(guest.priority)} aria-label={`${copy.priorityFor} ${guest.fullName}`}>{Array.from({ length: 11 }, (_, priority) => <option key={priority} value={priority}>{priority}</option>)}</Select></td>
                    <td className="px-3 py-2"><Select name="guestLocked" defaultValue={guest.seatLocked ? 'true' : 'false'} aria-label={`${copy.lockFor} ${guest.fullName}`}><option value="false">{copy.no}</option><option value="true">{copy.yes}</option></Select></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <Button type="submit" disabled={savingGuests} className="print:hidden">{savingGuests ? copy.savingGuests : copy.saveGuests(visibleGuests.length)}</Button>
            <Result state={guestState} />
          </form>
        )}
      </Card>
    </div>
  );
}
