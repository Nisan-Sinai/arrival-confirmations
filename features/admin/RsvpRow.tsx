'use client';

import { useActionState, useId, useState } from 'react';

import { deleteRsvpAction, updateRsvpAction, type ManageRsvpState } from '@/app/actions/manageRsvp';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { Alert, Badge } from '@/components/ui/feedback';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';
import { formatIsraeliPhoneForDisplay } from '@/lib/phone';

const INITIAL: ManageRsvpState = { status: 'idle', message: '' };

const STATUS_TONES = {
  attending: 'success',
  not_attending: 'danger',
  maybe: 'warning',
} as const;

const COPY = {
  he: {
    name: 'שם',
    phone: 'טלפון',
    status: 'סטטוס',
    count: 'כמות',
    details: 'תזונה והערות',
    attending: 'מגיע',
    notAttending: 'לא מגיע',
    maybe: 'אולי',
    edit: 'עריכת התשובה של',
    delete: 'מחיקת התשובה של',
    deleteConfirm: 'למחוק?',
    cancel: 'ביטול',
    adults: 'מבוגרים',
    children: 'ילדים',
    babies: 'תינוקות',
    saving: 'שומר…',
    save: 'שמירת השינויים',
    close: 'סגירה',
  },
  en: {
    name: 'Name',
    phone: 'Phone',
    status: 'Status',
    count: 'Count',
    details: 'Dietary & notes',
    attending: 'Attending',
    notAttending: 'Not attending',
    maybe: 'Maybe',
    edit: 'Edit the response from',
    delete: 'Delete the response from',
    deleteConfirm: 'Delete?',
    cancel: 'Cancel',
    adults: 'Adults',
    children: 'Children',
    babies: 'Babies',
    saving: 'Saving…',
    save: 'Save changes',
    close: 'Close',
  },
} as const;

export interface RsvpRowData {
  readonly id: string;
  readonly full_name: string;
  readonly phone_normalized: string;
  readonly attendance_status: 'attending' | 'not_attending' | 'maybe';
  readonly adults_count: number;
  readonly children_count: number;
  readonly babies_count: number;
  readonly dietary_requirements: string | null;
  readonly notes: string | null;
}

function Cell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="text-muted-foreground block text-xs lg:sr-only">{label}</span>
      <span className="mt-0.5 block lg:mt-0">{children}</span>
    </div>
  );
}

export function RsvpRow({ rsvp, eventId }: { rsvp: RsvpRowData; eventId: string }) {
  const locale = useAppLocale();
  const copy = COPY[locale];
  const statusLabels = {
    attending: copy.attending,
    not_attending: copy.notAttending,
    maybe: copy.maybe,
  } as const;
  const [state, formAction, isPending] = useActionState(updateRsvpAction, INITIAL);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const editorId = useId();
  const total = rsvp.adults_count + rsvp.children_count + rsvp.babies_count;

  return (
    <li className="border-border bg-card lg:hover:bg-secondary/25 rounded-xl border p-4 transition-colors lg:rounded-none lg:border-x-0 lg:border-t-0 lg:px-3 lg:py-3.5">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1.1fr_0.8fr_0.9fr_1.5fr_auto] lg:items-center lg:gap-4">
        <Cell label={copy.name}>
          <span className="text-foreground font-semibold">{rsvp.full_name}</span>
        </Cell>

        <Cell label={copy.phone}>
          <a
            href={`tel:${rsvp.phone_normalized.replace(/[^\d+]/g, '')}`}
            className="text-primary rounded-sm underline-offset-4 hover:underline"
            dir="ltr"
          >
            {formatIsraeliPhoneForDisplay(rsvp.phone_normalized)}
          </a>
        </Cell>

        <Cell label={copy.status}>
          <Badge tone={STATUS_TONES[rsvp.attendance_status]}>
            {statusLabels[rsvp.attendance_status]}
          </Badge>
        </Cell>

        <Cell label={copy.count}>
          {rsvp.attendance_status === 'not_attending' ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="tabular-nums">
              <span className="font-semibold">{total}</span>
              <span className="text-muted-foreground text-xs">
                {' '}
                ({rsvp.adults_count}/{rsvp.children_count}/{rsvp.babies_count})
              </span>
            </span>
          )}
        </Cell>

        <Cell label={copy.details} className="min-w-0">
          <span className="text-muted-foreground block text-sm break-words">
            {rsvp.dietary_requirements ?? '—'}
            {rsvp.notes !== null && (
              <>
                <br />
                {rsvp.notes}
              </>
            )}
          </span>
        </Cell>

        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-primary size-9"
            aria-expanded={editing}
            aria-controls={editorId}
            onClick={() => setEditing((open) => !open)}
          >
            <span className="sr-only">
              {copy.edit} {rsvp.full_name}
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4.5"
            >
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </Button>

          {confirmingDelete ? (
            <form action={deleteRsvpAction} className="flex items-center gap-1">
              <input type="hidden" name="rsvpId" value={rsvp.id} />
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="destructive" size="sm">
                {copy.deleteConfirm}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                {copy.cancel}
              </Button>
            </form>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive size-9"
              onClick={() => setConfirmingDelete(true)}
            >
              <span className="sr-only">
                {copy.delete} {rsvp.full_name}
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4.5"
              >
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
              </svg>
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <div id={editorId} className="border-border bg-muted/40 mt-4 rounded-xl border p-4">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="rsvpId" value={rsvp.id} />
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="locale" value={locale} />

            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <Field label={copy.status}>
                <Select name="attendanceStatus" defaultValue={rsvp.attendance_status}>
                  <option value="attending">{copy.attending}</option>
                  <option value="maybe">{copy.maybe}</option>
                  <option value="not_attending">{copy.notAttending}</option>
                </Select>
              </Field>

              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ['adultsCount', copy.adults, rsvp.adults_count],
                    ['childrenCount', copy.children, rsvp.children_count],
                    ['babiesCount', copy.babies, rsvp.babies_count],
                  ] as const
                ).map(([name, label, value]) => (
                  <Field key={name} label={label}>
                    <Input
                      name={name}
                      type="number"
                      min={0}
                      max={30}
                      inputMode="numeric"
                      className="text-center"
                      defaultValue={value}
                    />
                  </Field>
                ))}
              </div>
            </div>

            {state.status !== 'idle' && (
              <Alert tone={state.status === 'saved' ? 'success' : 'error'}>{state.message}</Alert>
            )}

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? copy.saving : copy.save}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                {copy.close}
              </Button>
            </div>
          </form>
        </div>
      )}
    </li>
  );
}
