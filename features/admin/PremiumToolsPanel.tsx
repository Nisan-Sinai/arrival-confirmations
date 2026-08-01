'use client';

import { useActionState } from 'react';

import {
  importGuestsAction,
  queueWhatsAppAction,
  saveBrandingAction,
  saveSeatingAction,
  type PremiumToolState,
} from '@/app/actions/managePremiumTools';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { seatingSummary } from '@/lib/premiumEventTools';

const INITIAL: PremiumToolState = { status: 'idle', message: '' };

export interface PremiumGuestRow {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string;
  readonly partySize: number;
  readonly tableName: string | null;
  readonly seatNumber: string | null;
}

export interface PremiumBrandingDefaults {
  readonly primaryColor: string;
  readonly accentColor: string;
  readonly logoUrl: string | null;
  readonly invitationStyle: string;
  readonly templateName: string;
  readonly languageCode: string;
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
  pendingMessages,
  sentMessages,
  failedMessages,
  providerConfigured,
}: {
  eventId: string;
  guests: readonly PremiumGuestRow[];
  branding: PremiumBrandingDefaults;
  pendingMessages: number;
  sentMessages: number;
  failedMessages: number;
  providerConfigured: boolean;
}) {
  const [importState, importAction, importing] = useActionState(importGuestsAction, INITIAL);
  const [brandingState, brandingAction, savingBranding] = useActionState(
    saveBrandingAction,
    INITIAL,
  );
  const [seatingState, seatingAction, savingSeating] = useActionState(saveSeatingAction, INITIAL);
  const [messageState, messageAction, scheduling] = useActionState(queueWhatsAppAction, INITIAL);
  const tables = seatingSummary(guests);

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <p className="text-eyebrow text-accent-strong font-semibold">רשימת מוזמנים</p>
        <h2 className="text-h2 text-primary mt-2 font-bold">יבוא מ-Excel</h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          מעלים XLSX ישירות מ-Excel, או CSV/TSV. עמודות החובה הן שם וטלפון; אפשר לצרף
          אימייל, צד, כמות, שולחן, מושב והערות. יבוא חוזר מעדכן לפי מספר הטלפון ולא יוצר
          כפילויות.
        </p>

        <form action={importAction} className="mt-6 space-y-4">
          <input type="hidden" name="eventId" value={eventId} />
          <Field label="קובץ מוזמנים" required hint="עד 1,000 שורות ועד 5MB">
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

      <Card padding="lg">
        <p className="text-eyebrow text-accent-strong font-semibold">הושבה</p>
        <h2 className="text-h2 text-primary mt-2 font-bold">מפת שולחנות ומושבים</h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          משייכים לכל מוזמן שולחן ומושב. השינויים נשמרים יחד, ומתאימים גם לנתונים שיובאו
          מהקובץ.
        </p>

        {tables.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2 text-sm">
            {tables.map((table) => (
              <li key={table.tableName} className="border-border bg-secondary/35 rounded-full border px-3 py-1.5">
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
                        <Input
                          name="tableName"
                          defaultValue={guest.tableName ?? ''}
                          aria-label={`שולחן עבור ${guest.fullName}`}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          name="seatNumber"
                          defaultValue={guest.seatNumber ?? ''}
                          aria-label={`מושב עבור ${guest.fullName}`}
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

      <Card padding="lg">
        <p className="text-eyebrow text-accent-strong font-semibold">אוטומציה</p>
        <h2 className="text-h2 text-primary mt-2 font-bold">WhatsApp ותזכורות</h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          יוצרים תור של הזמנות או תזכורות לכל המוזמנים, או רק למי שעדיין לא ענה. השליחה
          מתבצעת דרך WhatsApp Cloud API מתבנית עסקית מאושרת.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm">
          <div className="bg-secondary/35 rounded-xl p-3">
            <span className="text-primary block text-2xl font-bold">{pendingMessages}</span>
            ממתינות
          </div>
          <div className="bg-secondary/35 rounded-xl p-3">
            <span className="text-primary block text-2xl font-bold">{sentMessages}</span>
            נשלחו
          </div>
          <div className="bg-secondary/35 rounded-xl p-3">
            <span className="text-primary block text-2xl font-bold">{failedMessages}</span>
            נכשלו
          </div>
        </div>

        {!providerConfigured && (
          <Alert tone="warning" className="mt-5">
            מנגנון התזמון פעיל, אך כדי לשלוח בפועל יש להגדיר ב-Vercel את
            WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID ו-CRON_SECRET.
          </Alert>
        )}

        <form action={messageAction} className="mt-6 space-y-5">
          <input type="hidden" name="eventId" value={eventId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="סוג הודעה">
              <Select name="messageKind" defaultValue="reminder">
                <option value="invitation">הזמנה ראשונה</option>
                <option value="reminder">תזכורת</option>
              </Select>
            </Field>
            <Field label="נמענים">
              <Select name="scope" defaultValue="unanswered">
                <option value="unanswered">רק מי שלא ענה</option>
                <option value="all">כל המוזמנים</option>
              </Select>
            </Field>
          </div>
          <Field label="שם תבנית מאושרת ב-Meta">
            <Input name="templateName" dir="ltr" defaultValue={branding.templateName} required />
          </Field>
          <Field label="קוד שפה">
            <Input name="languageCode" dir="ltr" defaultValue={branding.languageCode} required />
          </Field>
          <Field label="מועד שליחה" required>
            <Input name="scheduledFor" type="datetime-local" required />
          </Field>
          <Button type="submit" disabled={scheduling || guests.length === 0}>
            {scheduling ? 'מתזמן…' : 'יצירת תור שליחה'}
          </Button>
          <Result state={messageState} />
        </form>
      </Card>
    </div>
  );
}
