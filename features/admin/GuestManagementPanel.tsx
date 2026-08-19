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
  importGuestFileAction,
  importPhoneContactsAction,
  saveGuestAction,
} from '@/app/actions/manageGuests';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';
import type { Locale } from '@/lib/i18n';

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
type SubmitVariant = 'primary' | 'secondary' | 'outline' | 'destructive';

const subscribeToContactPicker = () => () => undefined;
const getContactPickerSnapshot = (): boolean =>
  (navigator as NavigatorWithContacts).contacts !== undefined;
const getServerContactPickerSnapshot = (): boolean => false;

const fieldClass =
  'border-border-strong bg-background text-foreground min-h-11 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring]';
const textareaClass = `${fieldClass} min-h-24 resize-y`;

const COPY = {
  he: {
    optional: '(לא חובה)',
    fields: {
      fullName: 'שם מלא',
      phone: 'טלפון',
      partySize: 'כמות',
      email: 'אימייל',
      table: 'שולחן',
      seat: 'מושב',
      notes: 'הערות',
    },
    messages: {
      added: 'המוזמן נוסף בהצלחה.',
      updated: 'פרטי המוזמן נשמרו.',
      deleted: 'המוזמן הוסר מהרשימה.',
      contacts: (count: string) => `יובאו ${count || 'מספר'} אנשי קשר מהטלפון.`,
      file: (count: string) => `יובאו ${count || 'מספר'} מוזמנים מהקובץ.`,
      fields: 'יש למלא שם, טלפון וכמות תקינה.',
      phone: 'מספר הטלפון אינו תקין.',
      duplicate: 'כבר קיים מוזמן עם המספר הזה.',
      save: 'שמירת המוזמן נכשלה.',
      delete: 'מחיקת המוזמן נכשלה.',
      contactsEmpty: 'לא נבחרו אנשי קשר ולא הודבקה רשימה.',
      contactsInvalid: 'לא נמצא מספר טלפון ישראלי תקין.',
      contactsSave: 'ייבוא אנשי הקשר נכשל.',
      fileEmpty: 'יש לבחור קובץ.',
      fileLarge: 'הקובץ גדול מדי. הגודל המרבי הוא 5MB.',
      fileFormat: 'פורמט הקובץ אינו נתמך או שהקובץ אינו תקין.',
      pickerUnavailable: 'הדפדפן הזה אינו מאפשר בחירה ישירה. השתמשו בהדבקה או בהעלאת קובץ.',
      pickerEmpty: 'לא נבחרו אנשי קשר עם מספר טלפון.',
      pickerFailed: 'לא ניתן היה לפתוח את אנשי הקשר. אפשר להשתמש בהדבקה או בקובץ.',
    },
    quickAria: 'פעולות מהירות לניהול המוזמנים',
    manual: 'הוספה ידנית',
    phoneImport: 'אנשי קשר מהטלפון',
    fileImport: 'ייבוא קובץ',
    list: 'הרשימה',
    newGuest: 'מוזמן חדש',
    newGuestIntro: 'ממלאים שם, טלפון וכמות. אימייל, שולחן, מושב והערות הם שדות לא חובה.',
    addGuest: 'הוספת מוזמן',
    addingGuest: 'מוסיף מוזמן...',
    quickImport: 'ייבוא מהיר',
    phoneImportIntro: 'באנדרואיד ובדפדפן תומך אפשר לבחור כמה אנשי קשר יחד. בכל מכשיר אפשר גם להדביק רשימה.',
    directUnavailable: 'הבחירה הישירה אינה זמינה בדפדפן הזה. אפשר להדביק רשימה למטה או לייבא קובץ.',
    openingContacts: 'פותח אנשי קשר...',
    chooseContacts: 'בחירת אנשי קשר מהטלפון',
    pasteList: 'הדבקת רשימה',
    pastePlaceholder: 'ישראל ישראלי, 050-1234567\nשרה כהן, 052-7654321',
    pasteHelp: 'כל איש קשר בשורה חדשה: שם, פסיק ומספר טלפון.',
    importPasted: 'ייבוא הרשימה המודבקת',
    importingContacts: 'מייבא אנשי קשר...',
    fileIntro: 'נתמכים Excel, CSV, TSV וטקסט, עד 5MB.',
    chooseFile: 'קובץ מהטלפון או מהמחשב',
    importingFile: 'מייבא קובץ...',
    guestList: 'רשימת מוזמנים',
    manageEdit: 'ניהול ועריכה',
    records: 'רשומות',
    people: 'אנשים',
    assigned: 'שובצו',
    emptyTitle: 'עדיין אין מוזמנים ברשימה',
    emptyBody: 'התחילו בהוספה ידנית או בייבוא אנשי קשר מהטלפון.',
    importPhoneShort: 'ייבוא מהטלפון',
    search: 'חיפוש ברשימה',
    searchPlaceholder: 'שם, טלפון, אימייל או שולחן',
    noResults: 'לא נמצאו מוזמנים מתאימים',
    clearSearch: 'ניקוי החיפוש',
    quantity: 'כמות:',
    tablePrefix: 'שולחן',
    edit: 'עריכה',
    call: 'חיוג',
    saveChanges: 'שמירת שינויים',
    savingChanges: 'שומר שינויים...',
    deleteGuest: 'מחיקת המוזמן',
    deletingGuest: 'מוחק מוזמן...',
    deleteConfirm: (name: string) => `למחוק את ${name} מרשימת המוזמנים?`,
  },
  en: {
    optional: '(optional)',
    fields: {
      fullName: 'Full name',
      phone: 'Phone',
      partySize: 'Party size',
      email: 'Email',
      table: 'Table',
      seat: 'Seat',
      notes: 'Notes',
    },
    messages: {
      added: 'Guest added successfully.',
      updated: 'Guest details saved.',
      deleted: 'Guest removed from the list.',
      contacts: (count: string) => `Imported ${count || 'several'} phone contacts.`,
      file: (count: string) => `Imported ${count || 'several'} guests from the file.`,
      fields: 'Enter a name, phone number and valid party size.',
      phone: 'The phone number is invalid.',
      duplicate: 'A guest with this phone number already exists.',
      save: 'We could not save the guest.',
      delete: 'We could not delete the guest.',
      contactsEmpty: 'No contacts were selected and no list was pasted.',
      contactsInvalid: 'No valid Israeli phone number was found.',
      contactsSave: 'Contact import failed.',
      fileEmpty: 'Choose a file.',
      fileLarge: 'The file is too large. Maximum size is 5MB.',
      fileFormat: 'The file format is unsupported or the file is invalid.',
      pickerUnavailable: 'This browser cannot open contacts directly. Paste a list or upload a file instead.',
      pickerEmpty: 'No contacts with phone numbers were selected.',
      pickerFailed: 'Contacts could not be opened. Paste a list or use a file instead.',
    },
    quickAria: 'Quick guest management actions',
    manual: 'Add manually',
    phoneImport: 'Phone contacts',
    fileImport: 'Import file',
    list: 'Guest list',
    newGuest: 'New guest',
    newGuestIntro: 'Enter a name, phone number and party size. Email, table, seat and notes are optional.',
    addGuest: 'Add guest',
    addingGuest: 'Adding guest...',
    quickImport: 'Quick import',
    phoneImportIntro: 'On Android and supported browsers you can select several contacts at once. You can also paste a list on any device.',
    directUnavailable: 'Direct contact selection is unavailable in this browser. Paste a list below or import a file.',
    openingContacts: 'Opening contacts...',
    chooseContacts: 'Choose phone contacts',
    pasteList: 'Paste a list',
    pastePlaceholder: 'Israel Israeli, 050-1234567\nSarah Cohen, 052-7654321',
    pasteHelp: 'One contact per line: name, comma, phone number.',
    importPasted: 'Import pasted list',
    importingContacts: 'Importing contacts...',
    fileIntro: 'Excel, CSV, TSV and text files are supported, up to 5MB.',
    chooseFile: 'File from your phone or computer',
    importingFile: 'Importing file...',
    guestList: 'Guest list',
    manageEdit: 'Manage and edit',
    records: 'records',
    people: 'people',
    assigned: 'assigned',
    emptyTitle: 'There are no guests yet',
    emptyBody: 'Start by adding a guest manually or importing contacts from your phone.',
    importPhoneShort: 'Import from phone',
    search: 'Search guest list',
    searchPlaceholder: 'Name, phone, email or table',
    noResults: 'No matching guests found',
    clearSearch: 'Clear search',
    quantity: 'Party size:',
    tablePrefix: 'Table',
    edit: 'Edit',
    call: 'Call',
    saveChanges: 'Save changes',
    savingChanges: 'Saving changes...',
    deleteGuest: 'Delete guest',
    deletingGuest: 'Deleting guest...',
    deleteConfirm: (name: string) => `Delete ${name} from the guest list?`,
  },
} as const;

function messageFor(
  locale: Locale,
  saved: string,
  error: string,
  count: string,
): { tone: 'success' | 'error'; text: string } | null {
  const messages = COPY[locale].messages;
  if (saved === 'guest-added') return { tone: 'success', text: messages.added };
  if (saved === 'guest-updated') return { tone: 'success', text: messages.updated };
  if (saved === 'guest-deleted') return { tone: 'success', text: messages.deleted };
  if (saved === 'contacts') return { tone: 'success', text: messages.contacts(count) };
  if (saved === 'file') return { tone: 'success', text: messages.file(count) };
  if (error === 'guest-fields') return { tone: 'error', text: messages.fields };
  if (error === 'guest-phone') return { tone: 'error', text: messages.phone };
  if (error === 'guest-duplicate') return { tone: 'error', text: messages.duplicate };
  if (error === 'guest-save') return { tone: 'error', text: messages.save };
  if (error === 'guest-delete') return { tone: 'error', text: messages.delete };
  if (error === 'contacts-empty') return { tone: 'error', text: messages.contactsEmpty };
  if (error === 'contacts-invalid') return { tone: 'error', text: messages.contactsInvalid };
  if (error === 'contacts-save') return { tone: 'error', text: messages.contactsSave };
  if (error === 'file-empty') return { tone: 'error', text: messages.fileEmpty };
  if (error === 'file-large') return { tone: 'error', text: messages.fileLarge };
  if (error === 'file-format') return { tone: 'error', text: messages.fileFormat };
  return null;
}

function normalizeSearch(value: string, locale: Locale): string {
  return value
    .trim()
    .toLocaleLowerCase(locale === 'he' ? 'he-IL' : 'en-US')
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
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

function GuestFields({ guest, locale }: { readonly guest?: ManagedGuest; readonly locale: Locale }) {
  const copy = COPY[locale];
  const optional = <span className="text-muted-foreground font-normal">{copy.optional}</span>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-foreground text-sm font-medium">
        {copy.fields.fullName}
        <input name="fullName" autoComplete="name" required defaultValue={guest?.fullName ?? ''} className={`${fieldClass} mt-1.5`} />
      </label>
      <label className="text-foreground text-sm font-medium">
        {copy.fields.phone}
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required defaultValue={guest?.phone ?? ''} className={`${fieldClass} mt-1.5 text-start`} />
      </label>
      <label className="text-foreground text-sm font-medium">
        {copy.fields.partySize}
        <input name="partySize" type="number" inputMode="numeric" min="1" max="100" required defaultValue={guest?.partySize ?? 1} className={`${fieldClass} mt-1.5`} />
      </label>
      <label className="text-foreground text-sm font-medium">
        {copy.fields.email} {optional}
        <input name="email" type="email" inputMode="email" autoComplete="email" dir="ltr" defaultValue={guest?.email ?? ''} className={`${fieldClass} mt-1.5 text-start`} />
      </label>
      <label className="text-foreground text-sm font-medium">
        {copy.fields.table} {optional}
        <input name="tableName" defaultValue={guest?.tableName ?? ''} className={`${fieldClass} mt-1.5`} />
      </label>
      <label className="text-foreground text-sm font-medium">
        {copy.fields.seat} {optional}
        <input name="seatNumber" defaultValue={guest?.seatNumber ?? ''} className={`${fieldClass} mt-1.5`} />
      </label>
      <label className="text-foreground text-sm font-medium sm:col-span-2 lg:col-span-3">
        {copy.fields.notes} {optional}
        <textarea name="notes" defaultValue={guest?.notes ?? ''} className={`${textareaClass} mt-1.5`} />
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
  readonly mode: 'owner' | 'admin';
  readonly eventId: string;
  readonly guests: readonly ManagedGuest[];
  readonly saved?: string;
  readonly error?: string;
  readonly count?: string;
}) {
  const locale = useAppLocale();
  const copy = COPY[locale];
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
  const contactAction = mode === 'admin' ? adminImportPhoneContactsAction : importPhoneContactsAction;
  const status = messageFor(locale, saved, error, count);
  const totalPeople = useMemo(() => guests.reduce((sum, guest) => sum + guest.partySize, 0), [guests]);
  const assignedGuests = useMemo(
    () => guests.filter((guest) => guest.tableName !== null && guest.tableName.trim() !== '').length,
    [guests],
  );
  const filteredGuests = useMemo(() => {
    const normalizedQuery = normalizeSearch(query, locale);
    if (normalizedQuery === '') return guests;
    return guests.filter((guest) =>
      [guest.fullName, guest.phone, guest.email ?? '', guest.tableName ?? '', guest.seatNumber ?? '']
        .map((value) => normalizeSearch(value, locale))
        .join(' ')
        .includes(normalizedQuery),
    );
  }, [guests, locale, query]);

  const choosePhoneContacts = async () => {
    const contactsApi = (navigator as NavigatorWithContacts).contacts;
    if (contactsApi === undefined) {
      setPickerMessage(copy.messages.pickerUnavailable);
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
        setPickerMessage(copy.messages.pickerEmpty);
        return;
      }
      if (contactsJsonRef.current === null || contactsFormRef.current === null) return;
      contactsJsonRef.current.value = JSON.stringify(rows);
      contactsFormRef.current.requestSubmit();
    } catch (pickerError) {
      if (pickerError instanceof DOMException && pickerError.name === 'AbortError') return;
      setPickerMessage(copy.messages.pickerFailed);
    } finally {
      setSelectingContacts(false);
    }
  };

  return (
    <div className="space-y-6">
      {status !== null && <Alert tone={status.tone}>{status.text}</Alert>}

      <nav aria-label={copy.quickAria} className="border-border bg-card/95 sticky top-2 z-10 overflow-x-auto rounded-2xl border p-2 shadow-sm backdrop-blur">
        <div className="flex min-w-max gap-2">
          <a href="#manual-add" className={buttonClass({ variant: 'secondary', size: 'sm' })}>{copy.manual}</a>
          <a href="#phone-import" className={buttonClass({ variant: 'outline', size: 'sm' })}>{copy.phoneImport}</a>
          {mode === 'owner' && <a href="#file-import" className={buttonClass({ variant: 'outline', size: 'sm' })}>{copy.fileImport}</a>}
          <a href="#guest-list" className={buttonClass({ variant: 'ghost', size: 'sm' })}>{copy.list} ({guests.length})</a>
        </div>
      </nav>

      <section id="manual-add" className="scroll-mt-24" aria-labelledby="manual-add-title">
        <Card padding="lg">
          <p className="text-eyebrow text-accent-strong font-semibold">{copy.manual}</p>
          <h2 id="manual-add-title" className="text-h2 text-primary mt-2 font-bold">{copy.newGuest}</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{copy.newGuestIntro}</p>
          <form action={saveAction} className="mt-6 space-y-5">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="locale" value={locale} />
            <GuestFields locale={locale} />
            <SubmitButton idleLabel={copy.addGuest} pendingLabel={copy.addingGuest} className="w-full sm:w-auto" />
          </form>
        </Card>
      </section>

      <section id="phone-import" className="scroll-mt-24" aria-labelledby="phone-import-title">
        <Card padding="lg">
          <p className="text-eyebrow text-accent-strong font-semibold">{copy.quickImport}</p>
          <h2 id="phone-import-title" className="text-h2 text-primary mt-2 font-bold">{copy.phoneImport}</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">{copy.phoneImportIntro}</p>

          <form ref={contactsFormRef} action={contactAction} className="mt-6 space-y-4">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="locale" value={locale} />
            <input ref={contactsJsonRef} type="hidden" name="contactsJson" />
            {supportsContactPicker === false && <Alert tone="warning">{copy.directUnavailable}</Alert>}
            <Button type="button" onClick={choosePhoneContacts} disabled={supportsContactPicker !== true || selectingContacts} aria-disabled={supportsContactPicker !== true || selectingContacts} className="w-full sm:w-auto">
              {selectingContacts ? copy.openingContacts : copy.chooseContacts}
            </Button>
            {pickerMessage !== '' && <p role="status" className="text-muted-foreground text-sm">{pickerMessage}</p>}

            <div className="border-border border-t pt-5">
              <label className="text-foreground block text-sm font-medium">
                {copy.pasteList}
                <textarea name="pastedContacts" className={`${textareaClass} mt-1.5`} placeholder={copy.pastePlaceholder} aria-describedby="pasted-contacts-help" />
              </label>
              <p id="pasted-contacts-help" className="text-muted-foreground mt-2 text-xs">{copy.pasteHelp}</p>
              <SubmitButton idleLabel={copy.importPasted} pendingLabel={copy.importingContacts} variant="outline" className="mt-4 w-full sm:w-auto" />
            </div>
          </form>

          {mode === 'owner' && (
            <form id="file-import" action={importGuestFileAction} className="border-border mt-6 scroll-mt-24 space-y-4 border-t pt-6">
              <div>
                <h3 className="text-primary font-semibold">{copy.fileImport}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{copy.fileIntro}</p>
              </div>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="locale" value={locale} />
              <label className="text-foreground block text-sm font-medium">
                {copy.chooseFile}
                <input name="guestFile" type="file" accept=".xlsx,.csv,.tsv,.txt" required className={`${fieldClass} mt-1.5 file:me-3 file:rounded-full file:border-0 file:px-3 file:py-1.5`} />
              </label>
              <SubmitButton idleLabel={copy.fileImport} pendingLabel={copy.importingFile} variant="outline" className="w-full sm:w-auto" />
            </form>
          )}
        </Card>
      </section>

      <section id="guest-list" className="scroll-mt-24" aria-labelledby="guest-list-title">
        <Card padding="lg">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-eyebrow text-accent-strong font-semibold">{copy.guestList}</p>
              <h2 id="guest-list-title" className="text-h2 text-primary mt-2 font-bold">{copy.manageEdit}</h2>
            </div>
            <div className="text-muted-foreground text-sm">
              <span>{guests.length} {copy.records}</span><span aria-hidden="true"> · </span><span>{totalPeople} {copy.people}</span>
              {assignedGuests > 0 && <><span aria-hidden="true"> · </span><span>{assignedGuests} {copy.assigned}</span></>}
            </div>
          </div>

          {guests.length === 0 ? (
            <div className="border-border bg-secondary/20 mt-6 rounded-2xl border border-dashed p-6 text-center">
              <p className="text-primary font-semibold">{copy.emptyTitle}</p>
              <p className="text-muted-foreground mt-2 text-sm">{copy.emptyBody}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <a href="#manual-add" className={buttonClass({ size: 'sm' })}>{copy.addGuest}</a>
                <a href="#phone-import" className={buttonClass({ variant: 'outline', size: 'sm' })}>{copy.importPhoneShort}</a>
              </div>
            </div>
          ) : (
            <>
              <label className="text-foreground mt-6 block text-sm font-medium">
                {copy.search}
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} className={`${fieldClass} mt-1.5`} />
              </label>

              {filteredGuests.length === 0 ? (
                <div className="border-border mt-5 rounded-2xl border border-dashed p-6 text-center">
                  <p className="text-primary font-semibold">{copy.noResults}</p>
                  <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setQuery('')}>{copy.clearSearch}</Button>
                </div>
              ) : (
                <ul className="mt-5 space-y-3">
                  {filteredGuests.map((guest) => (
                    <li key={guest.id} className="border-border rounded-2xl border p-4">
                      <details className="group">
                        <summary className="cursor-pointer list-none rounded-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-primary truncate font-semibold">{guest.fullName}</p>
                              <p className="text-muted-foreground mt-1 text-sm" dir="ltr">{guest.phone}</p>
                              <p className="text-muted-foreground mt-1 text-xs">
                                {copy.quantity} {guest.partySize}
                                {guest.tableName !== null && guest.tableName.trim() !== '' ? ` · ${copy.tablePrefix} ${guest.tableName}` : ''}
                              </p>
                            </div>
                            <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 text-sm">
                              {copy.edit}
                              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
                            </span>
                          </div>
                        </summary>

                        <div className="border-border mt-4 border-t pt-5">
                          <div className="mb-5 flex flex-wrap gap-2">
                            <a href={`tel:${guest.phone}`} className={buttonClass({ variant: 'outline', size: 'sm' })}>{copy.call}</a>
                            <a href={whatsappUrl(guest.phone)} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: 'ghost', size: 'sm' })}>WhatsApp</a>
                          </div>

                          <form action={saveAction} className="space-y-5">
                            <input type="hidden" name="eventId" value={eventId} />
                            <input type="hidden" name="guestId" value={guest.id} />
                            <input type="hidden" name="locale" value={locale} />
                            <GuestFields guest={guest} locale={locale} />
                            <SubmitButton idleLabel={copy.saveChanges} pendingLabel={copy.savingChanges} className="w-full sm:w-auto" />
                          </form>

                          <form action={deleteAction} className="mt-3" onSubmit={(submitEvent) => { if (!window.confirm(copy.deleteConfirm(guest.fullName))) submitEvent.preventDefault(); }}>
                            <input type="hidden" name="eventId" value={eventId} />
                            <input type="hidden" name="guestId" value={guest.id} />
                            <input type="hidden" name="locale" value={locale} />
                            <SubmitButton idleLabel={copy.deleteGuest} pendingLabel={copy.deletingGuest} variant="destructive" className="w-full sm:w-auto" />
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
