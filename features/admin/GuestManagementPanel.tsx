'use client';

import { useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

import { adminImportPhoneContactsAction } from '@/app/actions/adminGuestImports';
import {
  adminDeleteGuestAction,
  adminResetGuestListAction,
  adminSaveGuestAction,
} from '@/app/actions/manageAdminCustomerEvent';
import {
  deleteGuestAction,
  toggleGuestCheckInAction,
  importGuestFileAction,
  importPhoneContactsAction,
  resetGuestListAction,
  saveGuestAction,
} from '@/app/actions/manageGuests';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Alert, Badge } from '@/components/ui/feedback';
import { Icon, type IconName } from '@/components/ui/icons';
import { SearchInput } from '@/components/ui/search-input';
import { UI_MESSAGES } from '@/config/messages';
import { formatStoredPhoneForDisplay } from '@/lib/phone';
import { cn } from '@/lib/utils';

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
  if (saved === 'guest-merged') {
    return { tone: 'success', text: 'המספר כבר היה ברשימה — הפרטים עודכנו לפי הרשומה החדשה.' };
  }
  if (saved === 'guests-reset') {
    return { tone: 'success', text: `רשימת המוזמנים אופסה. הוסרו ${count || 'כל'} רשומות פעילות.` };
  }
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
  if (error === 'guests-reset') {
    return { tone: 'error', text: 'איפוס רשימת המוזמנים נכשל. לא בוצעו שינויים נוספים.' };
  }
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

/** The first letters of a name, for the avatar disc beside it. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
}

function SubmitButton({
  idleLabel,
  pendingLabel,
  variant = 'primary',
  className,
  icon,
}: {
  readonly idleLabel: string;
  readonly pendingLabel: string;
  readonly variant?: SubmitVariant;
  readonly className?: string;
  readonly icon?: IconName;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      loading={pending}
      aria-disabled={pending}
      className={className}
    >
      {!pending && icon !== undefined && <Icon name={icon} />}
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

const OPTIONAL = 'לא חובה';

function GuestFields({ guest }: { readonly guest?: ManagedGuest }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="שם מלא" required>
        <Input name="fullName" autoComplete="name" defaultValue={guest?.fullName ?? ''} />
      </Field>
      <Field label="טלפון" required>
        <Input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          className="text-start"
          defaultValue={guest?.phone ?? ''}
        />
      </Field>
      <Field label="כמות" required>
        <Input
          name="partySize"
          type="number"
          inputMode="numeric"
          min="1"
          max="100"
          defaultValue={guest?.partySize ?? 1}
        />
      </Field>
      <Field label="אימייל" hint={OPTIONAL}>
        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          className="text-start"
          defaultValue={guest?.email ?? ''}
        />
      </Field>
      <Field label="שולחן" hint={OPTIONAL}>
        <Input name="tableName" defaultValue={guest?.tableName ?? ''} />
      </Field>
      <Field label="מושב" hint={OPTIONAL}>
        <Input name="seatNumber" defaultValue={guest?.seatNumber ?? ''} />
      </Field>
      <Field label="הערות" hint={OPTIONAL} className="sm:col-span-2 lg:col-span-3">
        <Textarea name="notes" rows={2} defaultValue={guest?.notes ?? ''} />
      </Field>
    </div>
  );
}

/** A card's eyebrow, heading and lede, with an icon disc at the start. */
function SectionIntro({
  id,
  icon,
  eyebrow,
  title,
  children,
}: {
  id: string;
  icon: IconName;
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <span
        aria-hidden="true"
        className="bg-accent-soft/70 text-accent-strong flex size-11 shrink-0 items-center justify-center rounded-xl"
      >
        <Icon name={icon} className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-eyebrow text-accent-strong font-semibold">{eyebrow}</p>
        <h2 id={id} className="text-primary mt-1 text-xl font-bold sm:text-2xl">
          {title}
        </h2>
        {children !== undefined && (
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{children}</p>
        )}
      </div>
    </div>
  );
}

/** What a confirmation dialog is currently asking about. */
type PendingDelete = { kind: 'reset' } | { kind: 'guest'; guest: ManagedGuest } | null;

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
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  // The ids of rows whose edit panel is open. Each panel is a full form — seven fields, a
  // submit-status hook, a delete form — so rendering one per guest up front froze the tab
  // on a real list of hundreds. The summary is always there; the panel mounts on open.
  const [openGuestIds, setOpenGuestIds] = useState<ReadonlySet<string>>(() => new Set());
  const setGuestOpen = (guestId: string, open: boolean) => {
    setOpenGuestIds((current) => {
      if (open === current.has(guestId)) return current;
      const next = new Set(current);
      if (open) next.add(guestId);
      else next.delete(guestId);
      return next;
    });
  };
  const contactsFormRef = useRef<HTMLFormElement>(null);
  const contactsJsonRef = useRef<HTMLInputElement>(null);
  const resetFormRef = useRef<HTMLFormElement>(null);
  const deleteFormRefs = useRef(new Map<string, HTMLFormElement>());
  const supportsContactPicker = useSyncExternalStore(
    subscribeToContactPicker,
    getContactPickerSnapshot,
    getServerContactPickerSnapshot,
  );

  const saveAction = mode === 'admin' ? adminSaveGuestAction : saveGuestAction;
  const deleteAction = mode === 'admin' ? adminDeleteGuestAction : deleteGuestAction;
  const resetAction = mode === 'admin' ? adminResetGuestListAction : resetGuestListAction;
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

  /**
   * The dialog confirms; the form that was already on the page submits. Nothing about
   * the write changes — the same action, the same hidden fields — only the question is
   * asked by the page instead of by the browser.
   */
  const confirmPendingDelete = () => {
    if (pendingDelete === null) return;
    const form =
      pendingDelete.kind === 'reset'
        ? resetFormRef.current
        : deleteFormRefs.current.get(pendingDelete.guest.id);
    setPendingDelete(null);
    form?.requestSubmit();
  };

  return (
    <div className="space-y-6">
      {status !== null && <Alert tone={status.tone}>{status.text}</Alert>}

      <section id="manual-add" className="scroll-mt-32" aria-labelledby="manual-add-title">
        <Card padding="lg">
          <SectionIntro
            id="manual-add-title"
            icon="user-plus"
            eyebrow="הוספה ידנית"
            title="מוזמן חדש"
          >
            ממלאים שם, טלפון וכמות. אימייל, שולחן, מושב והערות הם שדות לא חובה.
          </SectionIntro>
          <form action={saveAction} className="mt-6 space-y-5">
            <input type="hidden" name="eventId" value={eventId} />
            <GuestFields />
            <SubmitButton
              idleLabel="הוספת מוזמן"
              pendingLabel="מוסיף מוזמן..."
              icon="plus"
              className="w-full sm:w-auto"
            />
          </form>
        </Card>
      </section>

      <section id="phone-import" className="scroll-mt-32" aria-labelledby="phone-import-title">
        <Card padding="lg">
          <SectionIntro
            id="phone-import-title"
            icon="contacts"
            eyebrow="ייבוא מהיר"
            title="אנשי קשר מהטלפון"
          >
            באנדרואיד ובדפדפן תומך אפשר לבחור כמה אנשי קשר יחד. בכל מכשיר אפשר גם להדביק רשימה.
          </SectionIntro>

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
              <Icon name="contacts" />
              {selectingContacts ? 'פותח אנשי קשר...' : 'בחירת אנשי קשר מהטלפון'}
            </Button>

            {pickerMessage !== '' && (
              <p role="status" className="text-muted-foreground text-sm">
                {pickerMessage}
              </p>
            )}

            <div className="border-border border-t pt-5">
              <Field
                label="הדבקת רשימה"
                hint="שורה לכל מוזמן, שם ומספר טלפון בכל סדר. פסיק לא חובה — אפשר להדביק ישר מוואטסאפ או מפתק."
              >
                <Textarea
                  name="pastedContacts"
                  rows={4}
                  placeholder={'ישראל ישראלי, 050-1234567\nשרה כהן, 052-7654321'}
                />
              </Field>
              <SubmitButton
                idleLabel="ייבוא הרשימה המודבקת"
                pendingLabel="מייבא אנשי קשר..."
                variant="outline"
                icon="upload"
                className="mt-4 w-full sm:w-auto"
              />
            </div>
          </form>

          {mode === 'owner' && (
            <form
              id="file-import"
              action={importGuestFileAction}
              className="border-border mt-6 scroll-mt-32 space-y-4 border-t pt-6"
            >
              <div className="flex items-start gap-3">
                <Icon name="file-spreadsheet" className="text-accent-strong mt-0.5 size-5" />
                <div>
                  <h3 className="text-primary font-semibold">ייבוא מהיר מקובץ</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    שם וטלפון בלבד, מ-Excel/CSV/TSV, עד 5MB. לייבוא עם שולחן, מנה וצד — ייבוא
                    ה-Excel המלא שבכלים המתקדמים.
                  </p>
                </div>
              </div>
              <input type="hidden" name="eventId" value={eventId} />
              <Field label="קובץ מהטלפון או מהמחשב" required>
                <Input
                  name="guestFile"
                  type="file"
                  accept=".xlsx,.csv,.tsv,.txt"
                  className="file:bg-secondary file:text-secondary-foreground py-2 file:me-3 file:rounded-full file:border-0 file:px-3 file:py-1 file:text-sm file:font-semibold"
                />
              </Field>
              <SubmitButton
                idleLabel="ייבוא קובץ"
                pendingLabel="מייבא קובץ..."
                variant="outline"
                icon="upload"
                className="w-full sm:w-auto"
              />
            </form>
          )}
        </Card>
      </section>

      <section id="guest-list" className="scroll-mt-32" aria-labelledby="guest-list-title">
        <Card padding="lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionIntro
              id="guest-list-title"
              icon="users"
              eyebrow="רשימת מוזמנים"
              title="ניהול ועריכה"
            />
            <div className="text-muted-foreground flex flex-wrap gap-2 text-sm">
              <Badge tone="outline">{guests.length} רשומות</Badge>
              <Badge tone="outline">{totalPeople} אנשים</Badge>
              {assignedGuests > 0 && <Badge tone="gold">{assignedGuests} שובצו</Badge>}
            </div>
          </div>

          {guests.length === 0 ? (
            <div className="border-border bg-secondary/20 mt-6 flex flex-col items-center rounded-2xl border border-dashed p-8 text-center">
              <span className="border-accent-strong/30 text-accent-strong flex size-12 items-center justify-center rounded-full border">
                <Icon name="user-plus" className="size-5" />
              </span>
              <p className="text-primary mt-4 font-semibold">עדיין אין מוזמנים ברשימה</p>
              <p className="text-muted-foreground mt-1 text-sm">
                התחילו בהוספה ידנית או בייבוא אנשי קשר מהטלפון.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
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
              <SearchInput
                label="חיפוש ברשימה"
                placeholder="שם, טלפון, אימייל או שולחן"
                value={query}
                onValueChange={setQuery}
                className="mt-6"
              />

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
                    הצגת כל המוזמנים
                  </Button>
                </div>
              ) : (
                <ul className="mt-5 space-y-3">
                  {filteredGuests.map((guest) => {
                    const arrived = guest.checkedInAt !== null;
                    return (
                      <li
                        key={guest.id}
                        // content-visibility lets the browser skip layout and paint for
                        // rows off-screen — on a list of hundreds of guests, each holding
                        // a full edit form, rendering them all at once is what made the
                        // page feel stuck. The intrinsic size reserves a collapsed row's
                        // height so the scrollbar stays stable.
                        className={cn(
                          'border-border relative rounded-2xl border transition-colors duration-[--duration-fast]',
                          '[contain-intrinsic-size:auto_76px] [content-visibility:auto]',
                          arrived ? 'border-success/30 bg-success-soft/30' : 'bg-card',
                        )}
                      >
                        {/*
                          Owner mode only, and deliberately so: the person standing at the
                          door is the host, and giving the platform admin a second path to
                          the same write would need a second action with its own ownership
                          check for no one who would use it.

                          Positioned over the row's header rather than inside the
                          `<summary>`: a button nested in a disclosure control is two
                          interactive elements in one, which a screen reader cannot
                          separate and axe reports as a serious failure. The summary
                          reserves the space with its end padding.
                        */}
                        {mode === 'owner' && (
                          <form
                            action={toggleGuestCheckInAction}
                            className="absolute end-12 top-4 z-10 shrink-0 sm:end-24"
                          >
                            <input type="hidden" name="eventId" value={eventId} />
                            <input type="hidden" name="guestId" value={guest.id} />
                            <input
                              type="hidden"
                              name="checkedIn"
                              value={arrived ? 'false' : 'true'}
                            />
                            <Button
                              type="submit"
                              variant={arrived ? 'primary' : 'outline'}
                              size="sm"
                              aria-pressed={arrived}
                              className="gap-1.5"
                            >
                              <Icon name="check" strokeWidth={2.2} />
                              {arrived ? 'הגיע' : 'סימון הגעה'}
                            </Button>
                          </form>
                        )}
                        <details
                          className="group"
                          onToggle={(event) => setGuestOpen(guest.id, event.currentTarget.open)}
                        >
                          <summary
                            className={cn(
                              'flex cursor-pointer list-none items-center gap-3 rounded-2xl p-4 [&::-webkit-details-marker]:hidden',
                              mode === 'owner' && 'pe-40 sm:pe-56',
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                                arrived
                                  ? 'bg-success text-success-foreground'
                                  : 'bg-secondary text-primary',
                              )}
                            >
                              {arrived ? (
                                <Icon name="check" strokeWidth={2.4} className="size-4" />
                              ) : (
                                initials(guest.fullName)
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-primary truncate font-semibold">
                                {guest.fullName}
                              </p>
                              <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                                <span dir="ltr">{formatStoredPhoneForDisplay(guest.phone)}</span>
                                <span aria-hidden="true">·</span>
                                <span>
                                  {guest.partySize === 1 ? 'אדם אחד' : `${guest.partySize} אנשים`}
                                </span>
                                {guest.tableName !== null && guest.tableName.trim() !== '' && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>שולחן {guest.tableName}</span>
                                  </>
                                )}
                              </p>
                            </div>
                            <span className="text-muted-foreground absolute end-4 top-1/2 inline-flex shrink-0 -translate-y-1/2 items-center gap-1 text-sm group-open:top-8">
                              <span className="hidden sm:inline">עריכה</span>
                              <Icon
                                name="chevron-down"
                                strokeWidth={2}
                                className="size-4 transition-transform duration-[--duration-base] group-open:rotate-180"
                              />
                            </span>
                          </summary>

                          {openGuestIds.has(guest.id) && (
                            <div className="border-border border-t p-4 pt-5">
                              <div className="mb-5 flex flex-wrap gap-2">
                                <a
                                  href={`tel:${guest.phone}`}
                                  className={buttonClass({ variant: 'outline', size: 'sm' })}
                                >
                                  <Icon name="phone" />
                                  חיוג
                                </a>
                                <a
                                  href={whatsappUrl(guest.phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={buttonClass({ variant: 'outline', size: 'sm' })}
                                >
                                  <Icon name="whatsapp" />
                                  WhatsApp{' '}
                                  <span className="sr-only">({UI_MESSAGES.a11y.externalLink})</span>
                                </a>
                              </div>

                              <form action={saveAction} className="space-y-5">
                                <input type="hidden" name="eventId" value={eventId} />
                                <input type="hidden" name="guestId" value={guest.id} />
                                <GuestFields guest={guest} />
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <SubmitButton
                                    idleLabel="שמירת שינויים"
                                    pendingLabel="שומר שינויים..."
                                    className="w-full sm:w-auto"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive-soft hover:text-destructive w-full sm:w-auto"
                                    onClick={() => setPendingDelete({ kind: 'guest', guest })}
                                  >
                                    <Icon name="trash" />
                                    מחיקת המוזמן
                                  </Button>
                                </div>
                              </form>

                              {/* The write itself: hidden, submitted by the dialog above. */}
                              <form
                                action={deleteAction}
                                ref={(element) => {
                                  if (element === null) deleteFormRefs.current.delete(guest.id);
                                  else deleteFormRefs.current.set(guest.id, element);
                                }}
                                className="hidden"
                              >
                                <input type="hidden" name="eventId" value={eventId} />
                                <input type="hidden" name="guestId" value={guest.id} />
                              </form>
                            </div>
                          )}
                        </details>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="border-destructive/25 bg-destructive-soft/40 mt-8 rounded-2xl border p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Icon
                      name="alert-triangle"
                      className="text-destructive mt-0.5 size-5 shrink-0"
                    />
                    <div>
                      <p className="text-foreground font-semibold">צריך להתחיל את הרשימה מחדש?</p>
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        מחיקת כל המוזמנים מאפסת את הרשימה הפעילה, מבטלת קישורי הזמנה ישנים ומאפשרת
                        לייבא את אנשי הקשר מחדש. אישורי הגעה שכבר התקבלו נשמרים.
                      </p>
                    </div>
                  </div>
                  <form ref={resetFormRef} action={resetAction} className="shrink-0">
                    <input type="hidden" name="eventId" value={eventId} />
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full sm:w-auto"
                      onClick={() => setPendingDelete({ kind: 'reset' })}
                    >
                      <Icon name="trash" />
                      מחיקת כל המוזמנים
                    </Button>
                  </form>
                </div>
              </div>
            </>
          )}
        </Card>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        tone="destructive"
        title={
          pendingDelete?.kind === 'guest'
            ? `למחוק את ${pendingDelete.guest.fullName} מרשימת המוזמנים?`
            : `למחוק את כל ${guests.length} המוזמנים מהאירוע?`
        }
        description={
          pendingDelete?.kind === 'guest'
            ? 'הקישור האישי של המוזמן יבוטל. אישור הגעה שכבר התקבל נשמר.'
            : 'הפעולה תאפס גם נתוני הושבה ומעקב ולא ניתן לבטל אותה. אישורי הגעה שכבר התקבלו נשמרים.'
        }
        confirmLabel={pendingDelete?.kind === 'guest' ? 'מחיקת המוזמן' : 'מחיקת כל המוזמנים'}
        onConfirm={confirmPendingDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
