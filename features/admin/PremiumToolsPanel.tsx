'use client';

import { useActionState } from 'react';

import {
  importGuestsAction,
  saveBrandingAction,
  saveSeatingAction,
  type PremiumToolState,
} from '@/app/actions/managePremiumTools';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { ProSeatingStudio } from '@/features/admin/ProSeatingStudio';
import { PremiumWhatsAppCampaign } from '@/features/admin/PremiumWhatsAppCampaign';
import { VisualSeatingFloor } from '@/features/admin/VisualSeatingFloor';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';
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

const COPY = {
  he: {
    guestList: 'רשימת מוזמנים',
    excelTitle: 'יבוא מ-Excel',
    excelIntro: 'מעלים XLSX ישירות מ-Excel, או CSV/TSV. עמודות החובה הן שם וטלפון; אפשר לצרף אימייל, צד, כמות, שולחן, מושב והערות. יבוא חוזר מעדכן לפי מספר הטלפון ולא יוצר כפילויות.',
    guestFile: 'קובץ מוזמנים',
    fileHint: (limit: string) => `עד 1,000 שורות בקובץ ועד 5MB · קיבולת המסלול: ${limit} מוזמנים`,
    importing: 'מייבא…',
    importUpdate: 'יבוא ועדכון מוזמנים',
    template: 'הורדת תבנית מוכנה ל-Excel',
    templateName: 'תבנית-מוזמנים.csv',
    templateCsv: 'שם,טלפון,אימייל,צד,כמות,שולחן,מושב,הערות\nישראל ישראלי,050-1234567,israel@example.com,צד א,2,12,3,צמחוני',
    design: 'עיצוב',
    branding: 'מיתוג מתקדם',
    brandingIntro: 'צבעי מותג, לוגו וסגנון אישי להזמנה. התצוגה הציבורית מתעדכנת בלי לשנות את הקישור.',
    primaryColor: 'צבע ראשי',
    accentColor: 'צבע הדגשה',
    logoUrl: 'כתובת לוגו',
    logoHint: 'כתובת HTTPS לתמונה מרובעת או שקופה',
    style: 'סגנון הזמנה',
    classic: 'קלאסי',
    modern: 'מודרני',
    minimal: 'מינימליסטי',
    saving: 'שומר…',
    saveBranding: 'שמירת המיתוג',
    seating: 'הושבה',
    basicSeating: 'מפת שולחנות ומושבים בסיסית',
    basicIntro: 'משייכים לכל מוזמן שולחן ומושב. מסלול Pro מוסיף קיבולת, אזורים, קבוצות, נגישות, הושבה אוטומטית, נעילות, דוחות ונקודות שחזור.',
    importToSeat: 'ייבאו מוזמנים כדי להתחיל לבנות הושבה.',
    guest: 'מוזמן',
    phone: 'טלפון',
    party: 'כמות',
    table: 'שולחן',
    seat: 'מושב',
    tableFor: 'שולחן עבור',
    seatFor: 'מושב עבור',
    saveAllSeating: 'שמירת כל ההושבה',
  },
  en: {
    guestList: 'Guest list',
    excelTitle: 'Import from Excel',
    excelIntro: 'Upload XLSX directly from Excel, or CSV/TSV. Name and phone are required; email, side, party size, table, seat and notes are optional. Re-importing updates by phone number instead of creating duplicates.',
    guestFile: 'Guest file',
    fileHint: (limit: string) => `Up to 1,000 rows and 5MB per file · plan capacity: ${limit} guests`,
    importing: 'Importing…',
    importUpdate: 'Import and update guests',
    template: 'Download an Excel-ready template',
    templateName: 'guest-template.csv',
    templateCsv: 'Name,Phone,Email,Side,Party size,Table,Seat,Notes\nIsrael Israeli,050-1234567,israel@example.com,Side A,2,12,3,Vegetarian',
    design: 'Design',
    branding: 'Advanced branding',
    brandingIntro: 'Apply brand colours, a logo and a custom invitation style. The public invitation updates without changing its link.',
    primaryColor: 'Primary colour',
    accentColor: 'Accent colour',
    logoUrl: 'Logo URL',
    logoHint: 'HTTPS URL for a square or transparent image',
    style: 'Invitation style',
    classic: 'Classic',
    modern: 'Modern',
    minimal: 'Minimal',
    saving: 'Saving…',
    saveBranding: 'Save branding',
    seating: 'Seating',
    basicSeating: 'Basic tables and seats',
    basicIntro: 'Assign each guest a table and seat. Pro adds capacity, zones, groups, accessibility, automatic seating, locks, reports and restore points.',
    importToSeat: 'Import guests to start building a seating plan.',
    guest: 'Guest',
    phone: 'Phone',
    party: 'Party size',
    table: 'Table',
    seat: 'Seat',
    tableFor: 'Table for',
    seatFor: 'Seat for',
    saveAllSeating: 'Save all seating',
  },
} as const;

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
  eventTitle,
  inviteUrl,
  guests,
  branding,
  isPro,
  attendeeLimit,
  seatingTables,
  snapshotCount,
}: {
  eventId: string;
  eventTitle: string;
  inviteUrl: string;
  guests: readonly PremiumGuestRow[];
  branding: PremiumBrandingDefaults;
  isPro: boolean;
  attendeeLimit: number;
  seatingTables: readonly ProSeatingTable[];
  snapshotCount: number;
}) {
  const locale = useAppLocale();
  const copy = COPY[locale];
  const numberLocale = locale === 'he' ? 'he-IL' : 'en-US';
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

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <p className="text-eyebrow text-accent-strong font-semibold">{copy.guestList}</p>
        <h2 className="text-h2 text-primary mt-2 font-bold">{copy.excelTitle}</h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">{copy.excelIntro}</p>

        <form action={importAction} className="mt-6 space-y-4">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="locale" value={locale} />
          <Field
            label={copy.guestFile}
            required
            hint={copy.fileHint(attendeeLimit.toLocaleString(numberLocale))}
          >
            <Input name="guestFile" type="file" accept=".xlsx,.csv,.tsv,.txt" required />
          </Field>
          <Button type="submit" disabled={importing}>
            {importing ? copy.importing : copy.importUpdate}
          </Button>
          <Result state={importState} />
        </form>

        <a
          className="text-primary mt-4 inline-block text-sm underline underline-offset-4"
          href={`data:text/csv;charset=utf-8,%EF%BB%BF${encodeURIComponent(copy.templateCsv)}`}
          download={copy.templateName}
        >
          {copy.template}
        </a>
      </Card>

      <PremiumWhatsAppCampaign
        eventId={eventId}
        eventTitle={eventTitle}
        inviteUrl={inviteUrl}
        guests={guests}
      />

      <Card padding="lg">
        <p className="text-eyebrow text-accent-strong font-semibold">{copy.design}</p>
        <h2 className="text-h2 text-primary mt-2 font-bold">{copy.branding}</h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">{copy.brandingIntro}</p>

        <form action={brandingAction} className="mt-6 space-y-5">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="locale" value={locale} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.primaryColor}>
              <Input name="primaryColor" type="color" defaultValue={branding.primaryColor} />
            </Field>
            <Field label={copy.accentColor}>
              <Input name="accentColor" type="color" defaultValue={branding.accentColor} />
            </Field>
          </div>
          <Field label={copy.logoUrl} hint={copy.logoHint}>
            <Input
              name="logoUrl"
              type="url"
              dir="ltr"
              className="text-start"
              defaultValue={branding.logoUrl ?? ''}
              placeholder="https://example.com/logo.png"
            />
          </Field>
          <Field label={copy.style}>
            <Select name="invitationStyle" defaultValue={branding.invitationStyle}>
              <option value="classic">{copy.classic}</option>
              <option value="modern">{copy.modern}</option>
              <option value="minimal">{copy.minimal}</option>
            </Select>
          </Field>
          <Button type="submit" disabled={savingBranding}>
            {savingBranding ? copy.saving : copy.saveBranding}
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
          <p className="text-eyebrow text-accent-strong font-semibold">{copy.seating}</p>
          <h2 className="text-h2 text-primary mt-2 font-bold">{copy.basicSeating}</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">{copy.basicIntro}</p>

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
            <p className="text-muted-foreground mt-6">{copy.importToSeat}</p>
          ) : (
            <form action={seatingAction} className="mt-6 space-y-4">
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="locale" value={locale} />
              <div className="border-border overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-secondary/35 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-start">{copy.guest}</th>
                      <th className="px-4 py-3 text-start">{copy.phone}</th>
                      <th className="px-4 py-3 text-start">{copy.party}</th>
                      <th className="px-4 py-3 text-start">{copy.table}</th>
                      <th className="px-4 py-3 text-start">{copy.seat}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map((guest) => (
                      <tr key={guest.id} className="border-border border-t">
                        <td className="px-4 py-3 font-medium">
                          {guest.fullName}
                          <input type="hidden" name="guestId" value={guest.id} />
                        </td>
                        <td className="px-4 py-3" dir="ltr">{guest.phone}</td>
                        <td className="px-4 py-3">{guest.partySize}</td>
                        <td className="px-4 py-2">
                          <input
                            name="tableName"
                            defaultValue={guest.tableName ?? ''}
                            aria-label={`${copy.tableFor} ${guest.fullName}`}
                            className="border-input bg-card text-foreground w-full rounded-xl border px-3.5 py-2.5 text-base"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            name="seatNumber"
                            defaultValue={guest.seatNumber ?? ''}
                            aria-label={`${copy.seatFor} ${guest.fullName}`}
                            className="border-input bg-card text-foreground w-full rounded-xl border px-3.5 py-2.5 text-base"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="submit" disabled={savingSeating}>
                {savingSeating ? copy.saving : copy.saveAllSeating}
              </Button>
              <Result state={seatingState} />
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
