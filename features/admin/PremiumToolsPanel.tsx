'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import {
  importGuestsAction,
  saveBrandingAction,
  saveSeatingAction,
  type PremiumToolState,
} from '@/app/actions/managePremiumTools';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { ProSeatingStudio } from '@/features/admin/ProSeatingStudio';
import { VisualSeatingFloor } from '@/features/admin/VisualSeatingFloor';
import { seatingSummary } from '@/lib/premiumEventTools';
import type { ProSeatingGuest, ProSeatingTable } from '@/lib/proSeating';
import type { PremiumAttendanceStatus } from '@/lib/premiumWhatsApp';

const INITIAL: PremiumToolState = { status: 'idle', message: '' };

export interface PremiumGuestRow extends ProSeatingGuest {
  readonly phone: string;
  readonly attendanceStatus: PremiumAttendanceStatus;
}

export interface PremiumBrandingDefaults {
  readonly primaryColor: string;
  readonly accentColor: string;
  readonly logoUrl: string | null;
  readonly invitationStyle: string;
}

function Result({ state }: { state: PremiumToolState }) {
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

export function PremiumToolsPanel({
  eventId,
  guests,
  branding,
  isPro,
  attendeeLimit,
  seatingTables,
  snapshotCount,
  locked = false,
}: {
  eventId: string;
  guests: readonly PremiumGuestRow[];
  branding: PremiumBrandingDefaults;
  isPro: boolean;
  attendeeLimit: number;
  seatingTables: readonly ProSeatingTable[];
  snapshotCount: number;
  /** A host without an active paid plan sees the whole suite, greyed and inert, above a
   * single upgrade prompt — the product behind glass rather than a feature list. */
  readonly locked?: boolean;
}) {
  const [importState, importAction, importing] = useActionState(importGuestsAction, INITIAL);
  const [brandingState, brandingAction, savingBranding] = useActionState(
    saveBrandingAction,
    INITIAL,
  );
  const [seatingState, seatingAction, savingSeating] = useActionState(saveSeatingAction, INITIAL);
  const tables = seatingSummary(guests);
  const visualSeatingVersion = guests
    .map((guest) => `${guest.id}:${guest.tableId ?? ''}:${guest.seatLocked ? '1' : '0'}`)
    .join('|');

  const body = (
    <div className="space-y-6">
      <Card padding="lg">
        <p className="text-eyebrow text-accent-strong font-semibold">ייבוא מלא</p>
        <h2 className="text-h2 text-primary mt-2 font-bold">ייבוא מלא מ-Excel</h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          הייבוא המהיר שבניהול המוזמנים שומר שם וטלפון; כאן נכנסות גם כל שאר העמודות — אימייל, צד,
          כמות, שולחן, מושב והערות — מ-XLSX, CSV או TSV. יבוא חוזר מעדכן לפי מספר הטלפון ולא יוצר
          כפילויות.
        </p>

        <form action={importAction} className="mt-6 space-y-4">
          <input type="hidden" name="eventId" value={eventId} />
          <Field
            label="קובץ מוזמנים"
            required
            hint={`עד 1,000 שורות בקובץ ועד 5MB · קיבולת המסלול: ${attendeeLimit.toLocaleString('he-IL')} מוזמנים`}
          >
            <Input name="guestFile" type="file" accept=".xlsx,.csv,.tsv,.txt" required />
          </Field>
          <Button type="submit" disabled={importing}>
            {importing ? 'מייבא…' : 'יבוא ועדכון מוזמנים'}
          </Button>
          <Result state={importState} />
        </form>

        <a
          className="text-primary mt-4 inline-block text-sm underline underline-offset-4"
          href={
            'data:text/csv;charset=utf-8,%EF%BB%BF' +
            encodeURIComponent(
              'שם,טלפון,אימייל,צד,כמות,שולחן,מושב,הערות\nישראל ישראלי,050-1234567,israel@example.com,צד א,2,12,3,צמחוני',
            )
          }
          download="תבנית-מוזמנים.csv"
        >
          הורדת תבנית מוכנה ל-Excel
        </a>
      </Card>

      <Card padding="lg">
        <p className="text-eyebrow text-accent-strong font-semibold">עיצוב</p>
        <h2 className="text-h2 text-primary mt-2 font-bold">מיתוג מתקדם</h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          צבעי מותג, לוגו וסגנון אישי להזמנה. התצוגה הציבורית מתעדכנת בלי לשנות את הקישור.
        </p>

        <form action={brandingAction} className="mt-6 space-y-5">
          <input type="hidden" name="eventId" value={eventId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="צבע ראשי">
              <Input name="primaryColor" type="color" defaultValue={branding.primaryColor} />
            </Field>
            <Field label="צבע הדגשה">
              <Input name="accentColor" type="color" defaultValue={branding.accentColor} />
            </Field>
          </div>
          <Field label="כתובת לוגו" hint="כתובת HTTPS לתמונה מרובעת או שקופה">
            <Input
              name="logoUrl"
              type="url"
              dir="ltr"
              className="text-start"
              defaultValue={branding.logoUrl ?? ''}
              placeholder="https://example.com/logo.png"
            />
          </Field>
          <Field label="סגנון הזמנה">
            <Select name="invitationStyle" defaultValue={branding.invitationStyle}>
              <option value="classic">קלאסי</option>
              <option value="modern">מודרני</option>
              <option value="minimal">מינימליסטי</option>
            </Select>
          </Field>
          <Button type="submit" disabled={savingBranding}>
            {savingBranding ? 'שומר…' : 'שמירת המיתוג'}
          </Button>
          <Result state={brandingState} />
        </form>
      </Card>

      {isPro ? (
        <>
          <VisualSeatingFloor
            key={visualSeatingVersion}
            eventId={eventId}
            guests={guests}
            tables={seatingTables}
          />
          <ProSeatingStudio
            eventId={eventId}
            guests={guests}
            tables={seatingTables}
            snapshotCount={snapshotCount}
          />
        </>
      ) : (
        <Card padding="lg">
          <p className="text-eyebrow text-accent-strong font-semibold">הושבה</p>
          <h2 className="text-h2 text-primary mt-2 font-bold">מפת שולחנות ומושבים בסיסית</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            משייכים לכל מוזמן שולחן ומושב. מסלול Pro מוסיף קיבולת, אזורים, קבוצות, נגישות, הושבה
            אוטומטית, נעילות, דוחות ונקודות שחזור.
          </p>

          {tables.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2 text-sm">
              {tables.map((table) => (
                <li
                  key={table.tableName}
                  className="border-border bg-secondary/35 rounded-full border px-3 py-1.5"
                >
                  {table.tableName}: {table.seats}
                </li>
              ))}
            </ul>
          )}

          {guests.length === 0 ? (
            <p className="text-muted-foreground mt-6">ייבאו מוזמנים כדי להתחיל לבנות הושבה.</p>
          ) : (
            <form action={seatingAction} className="mt-6 space-y-4">
              <input type="hidden" name="eventId" value={eventId} />
              <div className="border-border overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-secondary/35 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-start">מוזמן</th>
                      <th className="px-4 py-3 text-start">טלפון</th>
                      <th className="px-4 py-3 text-start">כמות</th>
                      <th className="px-4 py-3 text-start">שולחן</th>
                      <th className="px-4 py-3 text-start">מושב</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map((guest) => (
                      <tr key={guest.id} className="border-border border-t">
                        <td className="px-4 py-3 font-medium">
                          {guest.fullName}
                          <input type="hidden" name="guestId" value={guest.id} />
                        </td>
                        <td className="px-4 py-3" dir="ltr">
                          {guest.phone}
                        </td>
                        <td className="px-4 py-3">{guest.partySize}</td>
                        <td className="px-4 py-2">
                          <input
                            name="tableName"
                            defaultValue={guest.tableName ?? ''}
                            aria-label={`שולחן עבור ${guest.fullName}`}
                            className="border-input bg-card text-foreground w-full rounded-xl border px-3.5 py-2.5 text-base"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            name="seatNumber"
                            defaultValue={guest.seatNumber ?? ''}
                            aria-label={`מושב עבור ${guest.fullName}`}
                            className="border-input bg-card text-foreground w-full rounded-xl border px-3.5 py-2.5 text-base"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="submit" disabled={savingSeating}>
                {savingSeating ? 'שומר…' : 'שמירת כל ההושבה'}
              </Button>
              <Result state={seatingState} />
            </form>
          )}
        </Card>
      )}
    </div>
  );

  if (!locked) {
    // A paying host needs the premium block to read as its own labelled section, not as
    // a wall of cards continuing the free guest list above it.
    return (
      <section aria-label="כלים מתקדמים" className="space-y-6">
        <div>
          <p className="text-eyebrow text-accent-strong font-semibold">
            {isPro ? 'Pro · הפקה והושבה' : 'Premium'}
          </p>
          <h2 className="text-h2 text-primary mt-2 font-bold">כלים מתקדמים</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            {isPro
              ? 'ייבוא מלא מ-Excel (עם שולחן ומנה), מיתוג וסטודיו הושבה מלא — מחוברים לרשימה שלכם.'
              : 'ייבוא מלא מ-Excel (עם שולחן ומנה), מיתוג וניהול הושבה — מחוברים לרשימה שלכם.'}
          </p>
        </div>
        {body}
      </section>
    );
  }

  return (
    <section aria-label="כלים מתקדמים של Premium">
      {/*
        The whole suite is shown, not described — but behind glass. The banner carries the
        one live control; the preview under it is greyed and marked `inert`, so nothing in
        it takes focus, a click or an Enter. That is the "grey, as if not clickable" a host
        without a plan should see: their real list, in the real tools, one upgrade away.
      */}
      <div className="border-accent/40 bg-accent-soft/40 flex flex-col items-start gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="bg-card text-accent-strong shadow-paper mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4.5"
            >
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <div>
            <h2 className="text-h2 text-primary font-bold">הכלים המתקדמים — עם Premium</h2>
            <p className="text-muted-foreground mt-1 max-w-xl text-sm leading-relaxed">
              ייבוא מלא מ-Excel (עם שולחן, מושב ומנה), מיתוג מתקדם וניהול הושבה — הכול כאן, מחובר
              לרשימה שלכם. נפתח לעריכה עם שדרוג המסלול.
            </p>
          </div>
        </div>
        <Link href="/pricing" className={buttonClass({ size: 'lg', className: 'shrink-0' })}>
          שדרוג ל-Premium
        </Link>
      </div>

      <div inert aria-hidden className="pointer-events-none mt-6 opacity-55 grayscale select-none">
        {body}
      </div>
    </section>
  );
}
