'use client';

import { useActionState, useId, useState } from 'react';

import { deleteRsvpAction, updateRsvpAction, type ManageRsvpState } from '@/app/actions/manageRsvp';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { Alert, Badge } from '@/components/ui/feedback';
import { formatIsraeliPhoneForDisplay } from '@/lib/phone';

/**
 * One reply, and the controls to correct it (§8).
 *
 * `updateRsvpAction` and `deleteRsvpAction` were written, tested by nobody and called
 * by nothing: the event page rendered a read-only table, so a host who was told over
 * the phone that a family had grown to five had no way to record it. This component
 * is the missing UI.
 *
 * The editor expands in place rather than opening a modal. A dialog would need a focus
 * trap, an escape handler and a scroll lock, and correcting a head count is not a task
 * that deserves to take over the screen. `aria-expanded` and `aria-controls` on the
 * toggle are what make the relationship legible to a screen reader without one.
 */

const INITIAL: ManageRsvpState = { status: 'idle', message: '' };

const STATUS_LABELS = {
  attending: 'מגיע',
  not_attending: 'לא מגיע',
  maybe: 'אולי',
} as const;

const STATUS_TONES = {
  attending: 'success',
  not_attending: 'danger',
  maybe: 'warning',
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

/** A datum plus its label, so the mobile stack is readable without a header row. */
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
      {/* Visible while the row is stacked, hidden once the columns line up under the
          header at lg — where repeating it in every row would be noise. */}
      <span className="text-muted-foreground block text-xs lg:sr-only">{label}</span>
      <span className="mt-0.5 block lg:mt-0">{children}</span>
    </div>
  );
}

export function RsvpRow({ rsvp, eventId }: { rsvp: RsvpRowData; eventId: string }) {
  const [state, formAction, isPending] = useActionState(updateRsvpAction, INITIAL);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const editorId = useId();

  const total = rsvp.adults_count + rsvp.children_count + rsvp.babies_count;

  return (
    <li className="border-border bg-card lg:hover:bg-secondary/25 rounded-xl border p-4 transition-colors lg:rounded-none lg:border-x-0 lg:border-t-0 lg:px-3 lg:py-3.5">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1.1fr_0.8fr_0.9fr_1.5fr_auto] lg:items-center lg:gap-4">
        <Cell label="שם">
          <span className="text-foreground font-semibold">{rsvp.full_name}</span>
        </Cell>

        <Cell label="טלפון">
          <a
            href={`tel:${rsvp.phone_normalized.replace(/[^\d+]/g, '')}`}
            className="text-primary rounded-sm underline-offset-4 hover:underline"
            dir="ltr"
          >
            {formatIsraeliPhoneForDisplay(rsvp.phone_normalized)}
          </a>
        </Cell>

        <Cell label="סטטוס">
          <Badge tone={STATUS_TONES[rsvp.attendance_status]}>
            {STATUS_LABELS[rsvp.attendance_status]}
          </Badge>
        </Cell>

        <Cell label="כמות">
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

        <Cell label="תזונה והערות" className="min-w-0">
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
            <span className="sr-only">עריכת התשובה של {rsvp.full_name}</span>
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
            // Two steps, no `window.confirm`: a native dialog is unstyleable, blocks
            // the main thread and reads in the browser's language, not the page's.
            <form action={deleteRsvpAction} className="flex items-center gap-1">
              <input type="hidden" name="rsvpId" value={rsvp.id} />
              <input type="hidden" name="eventId" value={eventId} />
              <Button type="submit" variant="destructive" size="sm">
                למחוק?
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                ביטול
              </Button>
            </form>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive size-9"
              onClick={() => setConfirmingDelete(true)}
            >
              <span className="sr-only">מחיקת התשובה של {rsvp.full_name}</span>
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

      {/* Full width of the row rather than trapped in the actions column, so the
          three count inputs sit side by side even on a phone. */}
      {editing && (
        <div id={editorId} className="border-border bg-muted/40 mt-4 rounded-xl border p-4">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="rsvpId" value={rsvp.id} />
            <input type="hidden" name="eventId" value={eventId} />

            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <Field label="סטטוס">
                <Select name="attendanceStatus" defaultValue={rsvp.attendance_status}>
                  <option value="attending">מגיע</option>
                  <option value="maybe">אולי</option>
                  <option value="not_attending">לא מגיע</option>
                </Select>
              </Field>

              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ['adultsCount', 'מבוגרים', rsvp.adults_count],
                    ['childrenCount', 'ילדים', rsvp.children_count],
                    ['babiesCount', 'תינוקות', rsvp.babies_count],
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
                {isPending ? 'שומר…' : 'שמירת השינויים'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                סגירה
              </Button>
            </div>
          </form>
        </div>
      )}
    </li>
  );
}
