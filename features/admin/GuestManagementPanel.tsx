'use client';

import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useFormStatus } from 'react-dom';

import { adminImportPhoneContactsAction } from '@/app/actions/adminGuestImports';
import {
  adminDeleteGuestAction,
  adminSaveGuestAction,
} from '@/app/actions/manageAdminCustomerEvent';
import {
  deleteGuestAction,
  toggleGuestCheckInAction,
  importGuestFileAction,
  importPhoneContactsAction,
  saveGuestAction,
} from '@/app/actions/manageGuests';
import { Button, buttonClass } from '@/components/ui/button';
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
  /** When the guest was marked as arrived. Null means unmarked, never absent. */
  readonly checkedInAt: string | null;
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

const subscribeToContactPicker = () => () => undefined;

function getContactPickerSnapshot(): boolean {
  return (navigator as NavigatorWithContacts).contacts !== undefined;
}

function getServerContactPickerSnapshot(): boolean {
  return false;
}
type SubmitVariant = 'primary' | 'secondary' | 'outline' | 'destructive';

const fieldClass =
  'border-border-strong bg-background text-foreground min-h-11 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring]';
const textareaClass = `${fieldClass} min-h-24 resize-y`;

function messageFor(
  saved: string,
  error: string,
  count: string,
  skipped: string,
): {
  tone: 'success' | 'error';
  text: string;
} | null {
  if (saved === 'guest-added') return { tone: 'success', text: 'המוזמן נוסף בהצלחה.' };
  if (saved === 'guest-updated') return { tone: 'success', text: 'פרטי המוזמן נשמרו.' };
  if (saved === 'guest-deleted') return { tone: 'success', text: 'המוזמן הוסר מהרשימה.' };
  if (saved === 'contacts') {
    // The skipped count is the whole reason this is worth reporting. The old parser
    // dropped anything without a comma in silence, so a host who pasted forty names and
    // got twelve had no way to know why — and went back to sharing one public link.
    const lost = Number(skipped ?? '');
    const tail =
      Number.isInteger(lost) && lost > 0 ? ` ${lost} שורות ללא מספר טלפון לא יובאו.` : '';
    return { tone: 'success', text: `יובאו ${count || 'מספר'} אנשי קשר.${tail}` };
  }
  if (saved === 'file') {
    return { tone: 'success', text: `יובאו ${count || 'מספר'} מוזמנים מהקובץ.` };
  }
  if (error === 'guest-fields') return { tone: 'error', text: 'יש למלא שם, טלפון וכמות תקינה.' };
  if (error === 'guest-phone') return { tone: 'error', text: 'מספר הטלפון אינו תקין.' };
  if (error === 'guest-duplicate') return { tone: 'error', text: 'כבר קיים מוזמן עם המספר הזה.' };
  if (error === 'guest-save') return { tone: 'error', text: 'שמירת המוזמן נכשלה.' };
  if (error === 'guest-delete') return { tone: 'error', text: 'מחיקת המוזמן נכשלה.' };
  if (error === 'contacts-none') {
    return { tone: 'error', text: 'לא נמצא אף מספר טלפון ברשימה שהודבקה.' };
  }
  if (error === 'contacts-empty') {
    return { tone: 'error', text: 'לא נבחרו אנשי קשר ולא הודבקה רשימה.' };
  }
  if (error === 'contacts-invalid') {
    return { tone: 'error', text: 'לא נמצא מספר טלפון ישראלי תקין.' };
  }
  if (error === 'contacts-save') return { tone: 'error', text: 'ייבוא אנשי הקשר נכשל.' };
  if (error === 'file-empty') return { tone: 'error', text: 'יש לבחור קובץ.' };
  if (error === 'file-large') {
    return { tone: 'error', text: 'הקובץ גדול מדי. הגודל המרבי הוא 5MB.' };
  }
  if (error === 'file-format') {
    return { tone: 'error', text: 'פורמט הקובץ אינו נתמך או שהקובץ אינו תקין.' };
  }
  return null;
}

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('he-IL')
    .replace(/[\s()-]/g, '');
}

function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const international = digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

function SubmitButton({
  idleLabel,
  pendingLabel,
  variant = 'primary',
  className,
}: {
  readonly idleLabel: string;
  readonly pendingLabel: string;
  readonly variant?: SubmitVariant;
  readonly className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      aria-disabled={pending}
      className={className}
    >
      {pending && (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="animate-spin" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
          <path
            d="M21 12a9 9 0 0 0-9-9"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      )}
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

function GuestFields({ guest }: { readonly guest?: ManagedGuest }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-foreground text-sm font-medium">
        שם מלא
        <input
          name="fullName"
          autoComplete="name"
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
          inputMode="tel"
          autoComplete="tel"
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
          inputMode="numeric"
          min="1"
          max="100"
          required
          defaultValue={guest?.partySize ?? 1}
          className={`${fieldClass} mt-1.5`}
        />
      </label>
      <label className="text-foreground text-sm font-medium">
        אימייל <span className="text-muted-foreground font-normal">(לא חובה)</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          defaultValue={guest?.email ?? ''}
          className={`${fieldClass} mt-1.5 text-start`}
        />
      </label>
      <label className="text-foreground text-sm font-medium">
        שולחן <span className="text-muted-foreground font-normal">(לא חובה)</span>
        <input
          name="tableName"
          defaultValue={guest?.tableName ?? ''}
          className={`${fieldClass} mt-1.5`}
        />
      </label>
      <label className="text-foreground text-sm font-medium">
        מושב <span className="text-muted-foreground font-normal">(לא חובה)</span>
        <input
          name="seatNumber"
          defaultValue={guest?.seatNumber ?? ''}
          className={`${fieldClass} mt-1.5`}
        />
      </label>
      <label className="text-foreground text-sm font-medium sm:col-span-2 lg:col-span-3">
        הערות <span className="text-muted-foreground font-normal">(לא חובה)</span>
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
  skipped = '',
}: {
  readonly mode: 'owner' | 'admin';
  readonly eventId: string;
  readonly guests: readonly ManagedGuest[];
  readonly saved?: string;
  /** How many pasted lines held no mobile number. Absent when none did. */
  readonly skipped?: string;
  readonly error?: string;
  readonly count?: string;
}) {
  const [pickerMessage, setPickerMessage] = useState('');
  const [selectingContacts, setSelectingContacts] = useState(false);
  const [query, setQuery] = useState('');
  const contactsFormRef = useRef<HTMLFormElement>(null);
  const contactsJsonRef = useRef<HTMLInputElement>(null);
  const supportsContactPicker = useSyncExternalStore(
    subscribeToContactPicker,
    getContactPickerSnapshot,
    getServerContactPickerSnapshot,
  );

  const saveAction = mode === 'admin' ? adminSaveGuestAction : saveGuestAction;
  const deleteAction = mode === 'admin' ? adminDeleteGuestAction : deleteGuestAction;
  const contactAction =
    mode === 'admin' ? adminImportPhoneContactsAction : importPhoneContactsAction;
  const status = messageFor(saved, error, count, skipped);

  const totalPeople = useMemo(
    () => guests.reduce((sum, guest) => sum + guest.partySize, 0),
    [guests],
  );
  const assignedGuests = useMemo(
    () =>
      guests.filter((guest) => guest.tableName !== null && guest.tableName.trim() !== '').length,
    [guests],
  );
  const filteredGuests = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (normalizedQuery === '') return guests;

    return guests.filter((guest) => {
      const searchable = [
        guest.fullName,
        guest.phone,
        guest.email ?? '',
        guest.tableName ?? '',
        guest.seatNumber ?? '',
      ]
        .map(normalizeSearch)
        .join(' ');
      return searchable.includes(normalizedQuery);
    });
  }, [guests, query]);

  const choosePhoneContacts = async () => {
    const contactsApi = (navigator as NavigatorWithContacts).contacts;
    if (contactsApi === undefined) {
      setPickerMessage('הדפדפן הזה אינו מאפשר בחירה ישירה. השתמשו בהדבקה או בהעלאת קובץ.');
      return;
    }

    setSelectingContacts(true);
    setPickerMessage('');
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
    } finally {
      setSelectingContacts(false);
    }
  };

  return (
    <div className="space-y-6">
      {status !== null && <Alert tone={status.tone}>{status.text}</Alert>}

      <nav
        aria-label="פעולות מהירות לניהול המוזמנים"
        className="border-border bg-card/95 sticky top-2 z-10 overflow-x-auto rounded-2xl border p-2 shadow-sm backdrop-blur"
      >
        <div className="flex min-w-max gap-2">
          <a href="#manual-add" className={buttonClass({ variant: 'secondary', size: 'sm' })}>
            הוספה ידנית
          </a>
          <a href="#phone-import" className={buttonClass({ variant: 'outline', size: 'sm' })}>
            אנשי קשר מהטלפון
          </a>
          {mode === 'owner' && (
            <a href="#file-import" className={buttonClass({ variant: 'outline', size: 'sm' })}>
              ייבוא קובץ
            </a>
          )}
          <a href="#guest-list" className={buttonClass({ variant: 'ghost', size: 'sm' })}>
            הרשימה ({guests.length})
          </a>
        </div>
      </nav>

      <section id="manual-add" className="scroll-mt-24" aria-labelledby="manual-add-title">
        <Card padding="lg">
          <p className="text-eyebrow text-accent-strong font-semibold">הוספה ידנית</p>
          <h2 id="manual-add-title" className="text-h2 text-primary mt-2 font-bold">
            מוזמן חדש
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            ממלאים שם, טלפון וכמות. אימייל, שולחן, מושב והערות הם שדות לא חובה.
          </p>
          <form action={saveAction} className="mt-6 space-y-5">
            <input type="hidden" name="eventId" value={eventId} />
            <GuestFields />
            <SubmitButton
              idleLabel="הוספת מוזמן"
              pendingLabel="מוסיף מוזמן..."
              className="w-full sm:w-auto"
            />
          </form>
        </Card>
      </section>

      <section id="phone-import" className="scroll-mt-24" aria-labelledby="phone-import-title">
        <Card padding="lg">
          <p className="text-eyebrow text-accent-strong font-semibold">ייבוא מהיר</p>
          <h2 id="phone-import-title" className="text-h2 text-primary mt-2 font-bold">
            אנשי קשר מהטלפון
          </h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            באנדרואיד ובדפדפן תומך אפשר לבחור כמה אנשי קשר יחד. בכל מכשיר אפשר גם להדביק רשימה.
          </p>

          <form ref={contactsFormRef} action={contactAction} className="mt-6 space-y-4">
            <input type="hidden" name="eventId" value={eventId} />
            <input ref={contactsJsonRef} type="hidden" name="contactsJson" />

            {supportsContactPicker === false && (
              <Alert tone="warning">
                הבחירה הישירה אינה זמינה בדפדפן הזה. אפשר להדביק רשימה למטה או לייבא קובץ.
              </Alert>
            )}

            <Button
              type="button"
              onClick={choosePhoneContacts}
              disabled={supportsContactPicker !== true || selectingContacts}
              aria-disabled={supportsContactPicker !== true || selectingContacts}
              className="w-full sm:w-auto"
            >
              {selectingContacts ? 'פותח אנשי קשר...' : 'בחירת אנשי קשר מהטלפון'}
            </Button>

            {pickerMessage !== '' && (
              <p role="status" className="text-muted-foreground text-sm">
                {pickerMessage}
              </p>
            )}

            <div className="border-border border-t pt-5">
              <label className="text-foreground block text-sm font-medium">
                הדבקת רשימה
                <textarea
                  name="pastedContacts"
                  className={`${textareaClass} mt-1.5`}
                  placeholder={'ישראל ישראלי, 050-1234567\nשרה כהן, 052-7654321'}
                  aria-describedby="pasted-contacts-help"
                />
              </label>
              <p id="pasted-contacts-help" className="text-muted-foreground mt-2 text-xs">
                שורה לכל מוזמן, שם ומספר טלפון בכל סדר. פסיק לא חובה — אפשר להדביק ישר מוואטסאפ או
                מפתק.
              </p>
              <SubmitButton
                idleLabel="ייבוא הרשימה המודבקת"
                pendingLabel="מייבא אנשי קשר..."
                variant="outline"
                className="mt-4 w-full sm:w-auto"
              />
            </div>
          </form>

          {mode === 'owner' && (
            <form
              id="file-import"
              action={importGuestFileAction}
              className="border-border mt-6 scroll-mt-24 space-y-4 border-t pt-6"
            >
              <div>
                <h3 className="text-primary font-semibold">ייבוא קובץ</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  נתמכים Excel, CSV, TSV וטקסט, עד 5MB.
                </p>
              </div>
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
              <SubmitButton
                idleLabel="ייבוא קובץ"
                pendingLabel="מייבא קובץ..."
                variant="outline"
                className="w-full sm:w-auto"
              />
            </form>
          )}
        </Card>
      </section>

      <section id="guest-list" className="scroll-mt-24" aria-labelledby="guest-list-title">
        <Card padding="lg">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-eyebrow text-accent-strong font-semibold">רשימת מוזמנים</p>
              <h2 id="guest-list-title" className="text-h2 text-primary mt-2 font-bold">
                ניהול ועריכה
              </h2>
            </div>
            <div className="text-muted-foreground text-sm">
              <span>{guests.length} רשומות</span>
              <span aria-hidden="true"> · </span>
              <span>{totalPeople} אנשים</span>
              {assignedGuests > 0 && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>{assignedGuests} שובצו</span>
                </>
              )}
            </div>
          </div>

          {guests.length === 0 ? (
            <div className="border-border bg-secondary/20 mt-6 rounded-2xl border border-dashed p-6 text-center">
              <p className="text-primary font-semibold">עדיין אין מוזמנים ברשימה</p>
              <p className="text-muted-foreground mt-2 text-sm">
                התחילו בהוספה ידנית או בייבוא אנשי קשר מהטלפון.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <a href="#manual-add" className={buttonClass({ size: 'sm' })}>
                  הוספת מוזמן
                </a>
                <a href="#phone-import" className={buttonClass({ variant: 'outline', size: 'sm' })}>
                  ייבוא מהטלפון
                </a>
              </div>
            </div>
          ) : (
            <>
              <label className="text-foreground mt-6 block text-sm font-medium">
                חיפוש ברשימה
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="שם, טלפון, אימייל או שולחן"
                  className={`${fieldClass} mt-1.5`}
                />
              </label>

              {filteredGuests.length === 0 ? (
                <div className="border-border mt-5 rounded-2xl border border-dashed p-6 text-center">
                  <p className="text-primary font-semibold">לא נמצאו מוזמנים מתאימים</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setQuery('')}
                  >
                    ניקוי החיפוש
                  </Button>
                </div>
              ) : (
                <ul className="mt-5 space-y-3">
                  {filteredGuests.map((guest) => (
                    <li key={guest.id} className="border-border rounded-2xl border p-4">
                      <details className="group">
                        <summary className="cursor-pointer list-none rounded-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-primary truncate font-semibold">
                                {guest.fullName}
                              </p>
                              <p className="text-muted-foreground mt-1 text-sm" dir="ltr">
                                {guest.phone}
                              </p>
                              <p className="text-muted-foreground mt-1 text-xs">
                                כמות: {guest.partySize}
                                {guest.tableName !== null && guest.tableName.trim() !== ''
                                  ? ` · שולחן ${guest.tableName}`
                                  : ''}
                              </p>
                            </div>
                            {/*
                              Owner mode only, and deliberately so: the person standing
                              at the door is the host, and giving the platform admin a
                              second path to the same write would need a second action
                              with its own ownership check for no one who would use it.
                            */}
                            {mode === 'owner' && (
                              <form action={toggleGuestCheckInAction} className="shrink-0">
                                <input type="hidden" name="eventId" value={eventId} />
                                <input type="hidden" name="guestId" value={guest.id} />
                                <input
                                  type="hidden"
                                  name="checkedIn"
                                  value={guest.checkedInAt === null ? 'true' : 'false'}
                                />
                                <Button
                                  type="submit"
                                  variant={guest.checkedInAt === null ? 'outline' : 'primary'}
                                  size="sm"
                                  aria-pressed={guest.checkedInAt !== null}
                                  className="gap-1.5"
                                  /* Inside a <summary>: a click here must mark an arrival,
                                     not open the edit panel underneath it. */
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="m4 12.5 5 5L20 6.5" />
                                  </svg>
                                  {guest.checkedInAt === null ? 'סימון הגעה' : 'הגיע'}
                                </Button>
                              </form>
                            )}
                            <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 text-sm">
                              עריכה
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="size-4 transition-transform group-open:rotate-180"
                              >
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </span>
                          </div>
                        </summary>

                        <div className="border-border mt-4 border-t pt-5">
                          <div className="mb-5 flex flex-wrap gap-2">
                            <a
                              href={`tel:${guest.phone}`}
                              className={buttonClass({ variant: 'outline', size: 'sm' })}
                            >
                              חיוג
                            </a>
                            <a
                              href={whatsappUrl(guest.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={buttonClass({ variant: 'ghost', size: 'sm' })}
                            >
                              WhatsApp
                            </a>
                          </div>

                          <form action={saveAction} className="space-y-5">
                            <input type="hidden" name="eventId" value={eventId} />
                            <input type="hidden" name="guestId" value={guest.id} />
                            <GuestFields guest={guest} />
                            <SubmitButton
                              idleLabel="שמירת שינויים"
                              pendingLabel="שומר שינויים..."
                              className="w-full sm:w-auto"
                            />
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
                            <SubmitButton
                              idleLabel="מחיקת המוזמן"
                              pendingLabel="מוחק מוזמן..."
                              variant="destructive"
                              className="w-full sm:w-auto"
                            />
                          </form>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Card>
      </section>
    </div>
  );
}
