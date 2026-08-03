'use client';

import { useRef, useState } from 'react';

import { adminImportPhoneContactsAction } from '@/app/actions/adminGuestImports';
import {
  adminDeleteGuestAction,
  adminSaveGuestAction,
} from '@/app/actions/manageAdminCustomerEvent';
import {
  deleteGuestAction,
  importGuestFileAction,
  importPhoneContactsAction,
  saveGuestAction,
} from '@/app/actions/manageGuests';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';

export interface ManagedGuest {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string;
  readonly email: string | null;
  readonly partySize: number;
  readonly tableName: string | null;
  readonly seatNumber: string | null;
  readonly notes: string | null;
}

interface ContactPickerEntry {
  readonly name?: readonly string[];
  readonly tel?: readonly string[];
}

interface ContactPickerManager {
  select(
    properties: readonly ('name' | 'tel')[],
    options: { multiple: boolean },
  ): Promise<readonly ContactPickerEntry[]>;
}

type NavigatorWithContacts = Navigator & { contacts?: ContactPickerManager };

const fieldClass =
  'border-border-strong bg-background text-foreground min-h-11 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring]';
const textareaClass = `${fieldClass} min-h-24 resize-y`;

function messageFor(
  saved: string,
  error: string,
  count: string,
): {
  tone: 'success' | 'error';
  text: string;
} | null {
  if (saved === 'guest-added') return { tone: 'success', text: 'המוזמן נוסף בהצלחה.' };
  if (saved === 'guest-updated') return { tone: 'success', text: 'פרטי המוזמן נשמרו.' };
  if (saved === 'guest-deleted') return { tone: 'success', text: 'המוזמן הוסר מהרשימה.' };
  if (saved === 'contacts') {
    return { tone: 'success', text: `יובאו ${count || 'מספר'} אנשי קשר מהטלפון.` };
  }
  if (saved === 'file')
    return { tone: 'success', text: `יובאו ${count || 'מספר'} מוזמנים מהקובץ.` };
  if (error === 'guest-fields') return { tone: 'error', text: 'יש למלא שם, טלפון וכמות תקינה.' };
  if (error === 'guest-phone') return { tone: 'error', text: 'מספר הטלפון אינו תקין.' };
  if (error === 'guest-duplicate') return { tone: 'error', text: 'כבר קיים מוזמן עם המספר הזה.' };
  if (error === 'guest-save') return { tone: 'error', text: 'שמירת המוזמן נכשלה.' };
  if (error === 'guest-delete') return { tone: 'error', text: 'מחיקת המוזמן נכשלה.' };
  if (error === 'contacts-empty')
    return { tone: 'error', text: 'לא נבחרו אנשי קשר ולא הודבקה רשימה.' };
  if (error === 'contacts-invalid')
    return { tone: 'error', text: 'לא נמצא מספר טלפון ישראלי תקין.' };
  if (error === 'contacts-save') return { tone: 'error', text: 'ייבוא אנשי הקשר נכשל.' };
  if (error === 'file-empty') return { tone: 'error', text: 'יש לבחור קובץ.' };
  if (error === 'file-large')
    return { tone: 'error', text: 'הקובץ גדול מדי. הגודל המרבי הוא 5MB.' };
  if (error === 'file-format')
    return { tone: 'error', text: 'פורמט הקובץ אינו נתמך או שהקובץ אינו תקין.' };
  return null;
}

function GuestFields({ guest }: { guest?: ManagedGuest }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-foreground text-sm font-medium">
        שם מלא
        <input
          name="fullName"
          required
          defaultValue={guest?.fullName ?? ''}
          className={`${fieldClass} mt-1.5`}
        />
      </label>
      <label className="text-foreground text-sm font-medium">
        טלפון
        <input
          name="phone"
          type="tel"
          dir="ltr"
          required
          defaultValue={guest?.phone ?? ''}
          className={`${fieldClass} mt-1.5 text-start`}
        />
      </label>
      <label className="text-foreground text-sm font-medium">
        כמות
        <input
          name="partySize"
          type="number"
          min="1"
          max="100"
          required
          defaultValue={guest?.partySize ?? 1}
          className={`${fieldClass} mt-1.5`}
        />
      </label>
      <label className="text-foreground text-sm font-medium">
        אימייל
        <input
          name="email"
          type="email"
          dir="ltr"
          defaultValue={guest?.email ?? ''}
          className={`${fieldClass} mt-1.5 text-start`}
        />
      </label>
      <label className="text-foreground text-sm font-medium">
        שולחן
        <input
          name="tableName"
          defaultValue={guest?.tableName ?? ''}
          className={`${fieldClass} mt-1.5`}
        />
      </label>
      <label className="text-foreground text-sm font-medium">
        מושב
        <input
          name="seatNumber"
          defaultValue={guest?.seatNumber ?? ''}
          className={`${fieldClass} mt-1.5`}
        />
      </label>
      <label className="text-foreground text-sm font-medium sm:col-span-2 lg:col-span-3">
        הערות
        <textarea
          name="notes"
          defaultValue={guest?.notes ?? ''}
          className={`${textareaClass} mt-1.5`}
        />
      </label>
    </div>
  );
}

export function GuestManagementPanel({
  mode,
  eventId,
  guests,
  saved = '',
  error = '',
  count = '',
}: {
  mode: 'owner' | 'admin';
  eventId: string;
  guests: readonly ManagedGuest[];
  saved?: string;
  error?: string;
  count?: string;
}) {
  const [pickerMessage, setPickerMessage] = useState('');
  const contactsFormRef = useRef<HTMLFormElement>(null);
  const contactsJsonRef = useRef<HTMLInputElement>(null);

  const saveAction = mode === 'admin' ? adminSaveGuestAction : saveGuestAction;
  const deleteAction = mode === 'admin' ? adminDeleteGuestAction : deleteGuestAction;
  const contactAction =
    mode === 'admin' ? adminImportPhoneContactsAction : importPhoneContactsAction;
  const status = messageFor(saved, error, count);

  const choosePhoneContacts = async () => {
    const contactsApi = (navigator as NavigatorWithContacts).contacts;
    if (contactsApi === undefined) {
      setPickerMessage('הדפדפן הזה אינו מאפשר בחירה ישירה. אפשר להדביק רשימה או להעלות קובץ.');
      return;
    }

    try {
      const selected = await contactsApi.select(['name', 'tel'], { multiple: true });
      const rows = selected.flatMap((contact) => {
        const name = contact.name?.[0]?.trim() ?? '';
        return (contact.tel ?? []).flatMap((phone) => {
          const cleanPhone = phone.trim();
          return cleanPhone === '' ? [] : [{ name: name || cleanPhone, phone: cleanPhone }];
        });
      });
      if (rows.length === 0) {
        setPickerMessage('לא נבחרו אנשי קשר עם מספר טלפון.');
        return;
      }
      if (contactsJsonRef.current === null || contactsFormRef.current === null) return;
      contactsJsonRef.current.value = JSON.stringify(rows);
      contactsFormRef.current.requestSubmit();
    } catch (pickerError) {
      if (pickerError instanceof DOMException && pickerError.name === 'AbortError') return;
      setPickerMessage('לא ניתן היה לפתוח את אנשי הקשר. אפשר להשתמש בהדבקה או בקובץ.');
    }
  };

  return (
    <div className="space-y-6">
      {status !== null && <Alert tone={status.tone}>{status.text}</Alert>}

      <Card padding="lg">
        <p className="text-eyebrow text-accent-strong font-semibold">הוספה ידנית</p>
        <h2 className="text-h2 text-primary mt-2 font-bold">מוזמן חדש</h2>
        <form action={saveAction} className="mt-6 space-y-5">
          <input type="hidden" name="eventId" value={eventId} />
          <GuestFields />
          <Button type="submit">הוספת מוזמן</Button>
        </form>
      </Card>

      <Card padding="lg">
        <p className="text-eyebrow text-accent-strong font-semibold">ייבוא מהיר</p>
        <h2 className="text-h2 text-primary mt-2 font-bold">ייבוא אנשי קשר מהטלפון</h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          במכשיר תומך אפשר לבחור אנשי קשר ישירות. אפשר גם להדביק רשימה כאשר בכל שורה מופיעים שם
          ומספר, מופרדים בפסיק.
        </p>

        <form ref={contactsFormRef} action={contactAction} className="mt-6 space-y-4">
          <input type="hidden" name="eventId" value={eventId} />
          <input ref={contactsJsonRef} type="hidden" name="contactsJson" />
          <Button type="button" onClick={choosePhoneContacts}>
            בחירת אנשי קשר מהטלפון
          </Button>
          <p className="text-muted-foreground text-sm">
            במכשיר שאינו תומך בבחירה ישירה תוצג אפשרות להשתמש בהדבקה או בקובץ.
          </p>
          {pickerMessage !== '' && <p className="text-muted-foreground text-sm">{pickerMessage}</p>}
          <label className="text-foreground block text-sm font-medium">
            הדבקת רשימה
            <textarea
              name="pastedContacts"
              className={`${textareaClass} mt-1.5`}
              placeholder={'ישראל ישראלי, 050-1234567\nשרה כהן, 052-7654321'}
            />
          </label>
          <Button type="submit" variant="outline">
            ייבוא הרשימה המודבקת
          </Button>
        </form>

        {mode === 'owner' && (
          <form
            action={importGuestFileAction}
            className="border-border mt-6 space-y-4 border-t pt-6"
          >
            <input type="hidden" name="eventId" value={eventId} />
            <label className="text-foreground block text-sm font-medium">
              קובץ מהטלפון או מהמחשב
              <input
                name="guestFile"
                type="file"
                accept=".xlsx,.csv,.tsv,.txt"
                required
                className={`${fieldClass} mt-1.5 file:me-3 file:rounded-full file:border-0 file:px-3 file:py-1.5`}
              />
            </label>
            <Button type="submit" variant="outline">
              ייבוא קובץ
            </Button>
          </form>
        )}
      </Card>

      <Card padding="lg">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-eyebrow text-accent-strong font-semibold">רשימת מוזמנים</p>
            <h2 className="text-h2 text-primary mt-2 font-bold">ניהול ידני</h2>
          </div>
          <p className="text-muted-foreground text-sm">{guests.length} מוזמנים פעילים</p>
        </div>

        {guests.length === 0 ? (
          <p className="text-muted-foreground mt-6">עדיין אין מוזמנים ברשימה.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {guests.map((guest) => (
              <li key={guest.id} className="border-border rounded-2xl border p-4">
                <details>
                  <summary className="cursor-pointer list-none rounded-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-primary font-semibold">{guest.fullName}</p>
                        <p className="text-muted-foreground mt-1 text-sm" dir="ltr">
                          {guest.phone}
                        </p>
                      </div>
                      <p className="text-muted-foreground text-sm">כמות: {guest.partySize}</p>
                    </div>
                  </summary>

                  <form action={saveAction} className="border-border mt-4 space-y-5 border-t pt-5">
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="guestId" value={guest.id} />
                    <GuestFields guest={guest} />
                    <div className="flex flex-wrap gap-3">
                      <Button type="submit">שמירת שינויים</Button>
                    </div>
                  </form>

                  <form
                    action={deleteAction}
                    className="mt-3"
                    onSubmit={(submitEvent) => {
                      if (!window.confirm(`למחוק את ${guest.fullName} מרשימת המוזמנים?`)) {
                        submitEvent.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="guestId" value={guest.id} />
                    <Button type="submit" variant="destructive">
                      מחיקת המוזמן
                    </Button>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
