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
import {
  buildSeatingCsv,
  getSeatingAnalytics,
  TABLE_SHAPE_LABELS,
  TABLE_SHAPES,
  type ProSeatingGuest,
  type ProSeatingTable,
} from '@/lib/proSeating';

const INITIAL: ProSeatingState = { status: 'idle', message: '' };

function Result({ state }: { state: ProSeatingState }) {
  if (state.status === 'idle') return null;
  return (
    <Alert tone={state.status === 'success' ? 'success' : 'error'}>
      <p>{state.message}</p>
      {state.details !== undefined && state.details.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-sm">
          {state.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
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

export function ProSeatingStudio({
  eventId,
  guests,
  tables,
  snapshotCount,
}: {
  eventId: string;
  guests: readonly ProSeatingGuest[];
  tables: readonly ProSeatingTable[];
  snapshotCount: number;
}) {
  const [tableState, tableAction, savingTables] = useActionState(saveProTablesAction, INITIAL);
  const [guestState, guestAction, savingGuests] = useActionState(
    saveProGuestSeatingAction,
    INITIAL,
  );
  const [autoState, autoAction, autoSeating] = useActionState(autoSeatGuestsAction, INITIAL);
  const [clearState, clearAction, clearing] = useActionState(clearUnlockedSeatingAction, INITIAL);
  const [snapshotState, snapshotAction, savingSnapshot] = useActionState(
    saveSeatingSnapshotAction,
    INITIAL,
  );
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'locked' | 'accessibility'>('all');

  const analytics = useMemo(() => getSeatingAnalytics(tables, guests), [tables, guests]);
  const tableById = useMemo(
    () => new Map(tables.map((table) => [table.id, table] as const)),
    [tables],
  );
  const visibleGuests = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('he');
    return guests.filter((guest) => {
      const matchesQuery =
        normalizedQuery === '' ||
        [guest.fullName, guest.seatingGroup, guest.familySide, guest.tableName]
          .filter((value): value is string => value !== null)
          .join(' ')
          .toLocaleLowerCase('he')
          .includes(normalizedQuery);
      if (!matchesQuery) return false;
      if (filter === 'unassigned') return guest.tableId === null;
      if (filter === 'locked') return guest.seatLocked;
      if (filter === 'accessibility') return guest.accessibilityNeeds !== null;
      return true;
    });
  }, [filter, guests, query]);
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(buildSeatingCsv(guests, tables))}`;

  return (
    <div className="space-y-6">
      <Card padding="lg" className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-eyebrow text-accent-strong font-semibold">Pro</p>
            <h2 className="text-h2 text-primary mt-2 font-bold">סטודיו סידורי הושבה</h2>
            <p className="text-muted-foreground mt-3 max-w-3xl leading-relaxed">
              שולחנות אמיתיים עם קיבולת, אזורים וצורות; קבוצות ומשפחות; צרכי נגישות; העדפות אוכל;
              נעילת מקומות; הושבה אוטומטית, בדיקות חריגה, ייצוא והדפסה. הכול פועל בתוך המערכת ללא
              שירות חיצוני בתשלום.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <a href={csvHref} download="סידור-הושבה.csv" className="border-border-strong text-primary rounded-xl border px-4 py-2 text-sm font-semibold">
              ייצוא ל-Excel
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="border-border-strong text-primary rounded-xl border px-4 py-2 text-sm font-semibold"
            >
              הדפסה
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Metric label="שולחנות" value={analytics.totalTables} hint="בכל האזורים" />
          <Metric label="קיבולת" value={analytics.totalCapacity} hint="מקומות זמינים" />
          <Metric label="משובצים" value={analytics.assignedPeople} hint="אנשים" />
          <Metric label="ללא שולחן" value={analytics.unassignedPeople} hint="אנשים לטיפול" />
          <Metric label="מקומות פנויים" value={analytics.emptySeats} hint="ללא חריגות" />
          <Metric label="מקומות נעולים" value={analytics.lockedGuests} hint="לא יזוזו אוטומטית" />
        </div>

        {analytics.overCapacityTables.length > 0 && (
          <Alert tone="error" className="mt-5">
            <p className="font-semibold">נמצאה חריגה בקיבולת:</p>
            <p className="mt-1 text-sm">
              {analytics.overCapacityTables
                .map((table) => `${table.name}: ${table.occupied}/${table.capacity}`)
                .join(' · ')}
            </p>
          </Alert>
        )}
      </Card>

      <Card padding="lg" className="print:hidden">
        <p className="text-eyebrow text-accent-strong font-semibold">פעולות חכמות</p>
        <h3 className="text-h3 text-primary mt-2 font-semibold">הושבה, איפוס ונקודות שחזור</h3>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <form action={autoAction} className="space-y-3">
            <input type="hidden" name="eventId" value={eventId} />
            <p className="text-muted-foreground text-sm leading-relaxed">
              משבץ לפי קבוצות, צד, גודל משפחה ועדיפות. מקומות נעולים נשמרים.
            </p>
            <Button type="submit" disabled={autoSeating || tables.length === 0}>
              {autoSeating ? 'מחשב הושבה…' : 'הושבה חכמה אוטומטית'}
            </Button>
            <Result state={autoState} />
          </form>

          <form action={clearAction} className="space-y-3">
            <input type="hidden" name="eventId" value={eventId} />
            <p className="text-muted-foreground text-sm leading-relaxed">
              מנקה את כל השיבוצים שאינם נעולים, בלי למחוק מוזמנים או שולחנות.
            </p>
            <Button type="submit" variant="outline" disabled={clearing}>
              {clearing ? 'מאפס…' : 'איפוס מקומות לא נעולים'}
            </Button>
            <Result state={clearState} />
          </form>

          <form action={snapshotAction} className="space-y-3">
            <input type="hidden" name="eventId" value={eventId} />
            <Field label={`נקודת שחזור · נשמרו ${snapshotCount}`}>
              <Input name="snapshotLabel" placeholder="לדוגמה: גרסה לאישור האולם" maxLength={120} />
            </Field>
            <Button type="submit" variant="outline" disabled={savingSnapshot}>
              {savingSnapshot ? 'שומר…' : 'שמירת מצב נוכחי'}
            </Button>
            <Result state={snapshotState} />
          </form>
        </div>
      </Card>

      <Card padding="lg">
        <p className="text-eyebrow text-accent-strong font-semibold">מפת האולם</p>
        <h3 className="text-h3 text-primary mt-2 font-semibold">שולחנות, קיבולת ואזורים</h3>
        <p className="text-muted-foreground mt-3 leading-relaxed print:hidden">
          אפשר לשנות את הסדר, הקיבולת והאזור. כדי למחוק שולחן קיים, מוחקים את שמו ושומרים; המוזמנים
          שהיו בו יחזרו לרשימת הלא משובצים.
        </p>

        {analytics.tables.length > 0 && (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {analytics.tables.map((table) => (
              <li key={table.id}>
                <Card
                  padding="none"
                  className={`h-full p-4 ${table.overCapacity ? 'border-destructive' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-primary font-semibold">{table.name}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {TABLE_SHAPE_LABELS[table.shape]}
                        {table.zone === null ? '' : ` · ${table.zone}`}
                      </p>
                    </div>
                    <span className="text-primary text-lg font-bold tabular-nums">
                      {table.occupied}/{table.capacity}
                    </span>
                  </div>
                  <div className="bg-secondary mt-3 h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${Math.min(100, (table.occupied / table.capacity) * 100)}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {table.guestCount} רשומות · {table.remaining} מקומות פנויים
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <form action={tableAction} className="mt-6 space-y-4 print:hidden">
          <input type="hidden" name="eventId" value={eventId} />
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-secondary/35 text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-start">שם שולחן</th>
                  <th className="px-3 py-3 text-start">צורה</th>
                  <th className="px-3 py-3 text-start">קיבולת</th>
                  <th className="px-3 py-3 text-start">אזור</th>
                  <th className="px-3 py-3 text-start">הערה</th>
                </tr>
              </thead>
              <tbody>
                {[...tables, null].map((table, index) => (
                  <tr key={table?.id ?? 'new-table'} className="border-border border-t">
                    <td className="px-3 py-2">
                      <input type="hidden" name="tableId" value={table?.id ?? ''} />
                      <Input
                        name="tableName"
                        defaultValue={table?.name ?? ''}
                        placeholder={table === null ? 'שולחן חדש' : undefined}
                        aria-label={`שם שולחן ${index + 1}`}
                        maxLength={80}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        name="tableShape"
                        defaultValue={table?.shape ?? 'round'}
                        aria-label={`צורת שולחן ${index + 1}`}
                      >
                        {TABLE_SHAPES.map((shape) => (
                          <option key={shape} value={shape}>
                            {TABLE_SHAPE_LABELS[shape]}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        name="tableCapacity"
                        type="number"
                        min={1}
                        max={100}
                        defaultValue={table?.capacity ?? 10}
                        aria-label={`קיבולת שולחן ${index + 1}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        name="tableZone"
                        defaultValue={table?.zone ?? ''}
                        placeholder="מרכז / משפחה / צעירים"
                        aria-label={`אזור שולחן ${index + 1}`}
                        maxLength={80}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        name="tableNotes"
                        defaultValue={table?.notes ?? ''}
                        placeholder="קרוב לבמה, מעבר רחב…"
                        aria-label={`הערת שולחן ${index + 1}`}
                        maxLength={500}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="submit" disabled={savingTables}>
            {savingTables ? 'שומר שולחנות…' : 'שמירת מפת השולחנות'}
          </Button>
          <Result state={tableState} />
        </form>
      </Card>

      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-eyebrow text-accent-strong font-semibold">מוזמנים</p>
            <h3 className="text-h3 text-primary mt-2 font-semibold">שיבוץ והעדפות</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              מוצגים {visibleGuests.length} מתוך {guests.length} מוזמנים.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 print:hidden">
            <label className="text-sm font-medium">
              <span className="sr-only">חיפוש מוזמן, קבוצה או שולחן</span>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="חיפוש מוזמן, קבוצה או שולחן"
              />
            </label>
            <label className="text-sm font-medium">
              <span className="sr-only">סינון מוזמנים</span>
              <Select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as 'all' | 'unassigned' | 'locked' | 'accessibility')
                }
              >
                <option value="all">כל המוזמנים</option>
                <option value="unassigned">ללא שולחן</option>
                <option value="locked">מקומות נעולים</option>
                <option value="accessibility">צרכי נגישות</option>
              </Select>
            </label>
          </div>
        </div>

        {guests.length === 0 ? (
          <p className="text-muted-foreground mt-6">ייבאו מוזמנים כדי להתחיל לבנות הושבה.</p>
        ) : visibleGuests.length === 0 ? (
          <p className="text-muted-foreground mt-6">לא נמצאו מוזמנים לפי החיפוש והסינון.</p>
        ) : (
          <form action={guestAction} className="mt-6 space-y-4">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="border-border overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[1500px] text-sm">
                <thead className="bg-secondary/35 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 text-start">מוזמן</th>
                    <th className="px-3 py-3 text-start">כמות</th>
                    <th className="px-3 py-3 text-start">שולחן</th>
                    <th className="px-3 py-3 text-start">מושב</th>
                    <th className="px-3 py-3 text-start">קבוצה</th>
                    <th className="px-3 py-3 text-start">אוכל</th>
                    <th className="px-3 py-3 text-start">נגישות</th>
                    <th className="px-3 py-3 text-start">עדיפות</th>
                    <th className="px-3 py-3 text-start">נעילה</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGuests.map((guest) => {
                    const assignedTable = guest.tableId === null ? undefined : tableById.get(guest.tableId);
                    return (
                      <tr key={guest.id} className="border-border border-t align-top">
                        <td className="px-3 py-3 font-medium">
                          {guest.fullName}
                          <input type="hidden" name="guestId" value={guest.id} />
                          <p className="text-muted-foreground mt-1 text-xs">
                            {guest.familySide ?? 'ללא צד'}
                            {assignedTable?.zone === undefined ? '' : ` · ${assignedTable.zone ?? 'ללא אזור'}`}
                          </p>
                        </td>
                        <td className="px-3 py-3 tabular-nums">{guest.partySize}</td>
                        <td className="px-3 py-2">
                          <Select
                            name="guestTableId"
                            defaultValue={guest.tableId ?? ''}
                            aria-label={`שולחן עבור ${guest.fullName}`}
                          >
                            <option value="">ללא שולחן</option>
                            {tables.map((table) => (
                              <option key={table.id} value={table.id}>
                                {table.name} · {table.capacity} מקומות
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            name="guestSeatNumber"
                            defaultValue={guest.seatNumber ?? ''}
                            aria-label={`מושב עבור ${guest.fullName}`}
                            maxLength={40}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            name="guestGroup"
                            defaultValue={guest.seatingGroup ?? ''}
                            placeholder="משפחה / חברים"
                            aria-label={`קבוצה עבור ${guest.fullName}`}
                            maxLength={120}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            name="guestMeal"
                            defaultValue={guest.mealPreference ?? ''}
                            placeholder="רגיל / צמחוני"
                            aria-label={`העדפת אוכל עבור ${guest.fullName}`}
                            maxLength={120}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            name="guestAccessibility"
                            defaultValue={guest.accessibilityNeeds ?? ''}
                            placeholder="כיסא גלגלים / קרוב ליציאה"
                            aria-label={`צרכי נגישות עבור ${guest.fullName}`}
                            maxLength={500}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            name="guestPriority"
                            defaultValue={String(guest.priority)}
                            aria-label={`עדיפות עבור ${guest.fullName}`}
                          >
                            {Array.from({ length: 11 }, (_, priority) => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            name="guestLocked"
                            defaultValue={guest.seatLocked ? 'true' : 'false'}
                            aria-label={`נעילת מקום עבור ${guest.fullName}`}
                          >
                            <option value="false">לא</option>
                            <option value="true">כן</option>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button type="submit" disabled={savingGuests} className="print:hidden">
              {savingGuests ? 'שומר הושבה…' : `שמירת ${visibleGuests.length} המוזמנים המוצגים`}
            </Button>
            <Result state={guestState} />
          </form>
        )}
      </Card>
    </div>
  );
}
