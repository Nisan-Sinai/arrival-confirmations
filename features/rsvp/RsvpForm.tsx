'use client';

import { useActionState, useId, useState } from 'react';

import { submitRsvpAction, type RsvpFormState } from '@/app/actions/submitRsvp';
import { UI_MESSAGES } from '@/config/messages';

/**
 * The public RSVP form (§6, §9).
 *
 * `useActionState` keeps the whole thing working before hydration: the browser posts
 * the form natively and the Server Action still runs. That matters here more than in
 * most apps — a guest on a weak connection at a venue should be able to answer
 * before the JavaScript finishes loading.
 */

interface RsvpFormProps {
  readonly eventId: string;
  readonly sideALabel: string;
  readonly sideBLabel: string;
}

/**
 * Declared here rather than beside the action: a 'use server' module may only
 * export async functions, so a plain object exported from it arrives as undefined
 * on the client and the first render crashes reading state.fieldErrors.
 */
const INITIAL_STATE: RsvpFormState = { status: 'idle', message: '', fieldErrors: {} };

const COUNT_FIELDS = [
  { name: 'adultsCount', label: 'מבוגרים' },
  { name: 'childrenCount', label: 'ילדים' },
  { name: 'babiesCount', label: 'תינוקות' },
] as const;

const STATUS_OPTIONS = [
  { value: 'attending', label: 'נגיע בשמחה' },
  { value: 'maybe', label: 'עדיין לא בטוח' },
  { value: 'not_attending', label: 'לא נוכל להגיע' },
] as const;

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (message === undefined) return null;
  // §9: role="alert" announces the message when it appears, without moving focus.
  return (
    <p id={id} role="alert" className="text-destructive mt-1 text-sm">
      {message}
    </p>
  );
}

export function RsvpForm({ eventId, sideALabel, sideBLabel }: RsvpFormProps) {
  const [state, formAction, isPending] = useActionState<RsvpFormState, FormData>(
    submitRsvpAction,
    INITIAL_STATE,
  );
  const formId = useId();
  const [status, setStatus] = useState<string>('attending');

  if (state.status === 'success') {
    return (
      <section
        // §9: aria-live so a screen reader announces the outcome after submission.
        aria-live="polite"
        className="border-success/40 bg-card rounded-2xl border-2 p-8 text-center"
      >
        <h2 className="text-primary font-[family-name:var(--font-display)] text-2xl font-bold">
          {UI_MESSAGES.rsvp.successTitle}
        </h2>
        <p className="text-muted-foreground mt-3 text-base">{state.message}</p>
      </section>
    );
  }

  const error = (field: string) => state.fieldErrors[field];
  const describedBy = (field: string) =>
    error(field) === undefined ? undefined : `${formId}-${field}-error`;

  // Counts are meaningless once a guest has declined, so they are hidden rather than
  // left to be filled in and then rejected by a constraint they cannot see.
  const showCounts = status !== 'not_attending';

  return (
    <section className="bg-card rounded-2xl border p-6 sm:p-8">
      <h2 className="text-primary text-center font-[family-name:var(--font-display)] text-2xl font-bold">
        אישור הגעה
      </h2>

      <form action={formAction} className="mt-6 space-y-5" noValidate>
        <input type="hidden" name="eventId" value={eventId} />
        {/*
          §6.1 honeypot. Hidden without display:none, which many bots skip — they only
          fill fields they believe a human can see.

          Clipped to nothing rather than pushed to left-[-9999px]. The negative offset
          worked but widened the document to 10,359px, so every page scrolled sideways
          on a phone; the clip achieves the same concealment inside the layout.
        */}
        <div
          aria-hidden="true"
          className="absolute h-px w-px overflow-hidden"
          style={{ clipPath: 'inset(50%)' }}
        >
          <label htmlFor={`${formId}-company`}>אל תמלאו שדה זה</label>
          <input
            id={`${formId}-company`}
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor={`${formId}-fullName`} className="block text-sm font-semibold">
            שם מלא <span aria-hidden="true">*</span>
            <span className="sr-only">({UI_MESSAGES.a11y.requiredField})</span>
          </label>
          <input
            id={`${formId}-fullName`}
            name="fullName"
            type="text"
            required
            autoComplete="name"
            aria-invalid={error('fullName') !== undefined}
            aria-describedby={describedBy('fullName')}
            className="border-input focus-visible:border-ring mt-1.5 w-full rounded-lg border px-3 py-2.5 text-base"
          />
          <FieldError id={`${formId}-fullName-error`} message={error('fullName')} />
        </div>

        <div>
          <label htmlFor={`${formId}-phone`} className="block text-sm font-semibold">
            טלפון <span aria-hidden="true">*</span>
            <span className="sr-only">({UI_MESSAGES.a11y.requiredField})</span>
          </label>
          <input
            id={`${formId}-phone`}
            name="phone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="050-1234567"
            aria-invalid={error('phone') !== undefined}
            aria-describedby={describedBy('phone')}
            className="border-input focus-visible:border-ring mt-1.5 w-full rounded-lg border px-3 py-2.5 text-right text-base"
          />
          <FieldError id={`${formId}-phone-error`} message={error('phone')} />
        </div>

        {/* A radiogroup rather than a select: three options are faster to tap than a
            dropdown, and the choice stays visible while the rest is filled in. */}
        <fieldset>
          <legend className="text-sm font-semibold">
            האם תגיעו? <span aria-hidden="true">*</span>
          </legend>
          <div className="mt-2 space-y-2">
            {STATUS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="border-input has-checked:border-primary has-checked:bg-secondary/50 flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5"
              >
                <input
                  type="radio"
                  name="attendanceStatus"
                  value={option.value}
                  defaultChecked={option.value === 'attending'}
                  onChange={(e) => setStatus(e.target.value)}
                  className="accent-primary size-4"
                />
                <span className="text-base">{option.label}</span>
              </label>
            ))}
          </div>
          <FieldError id={`${formId}-attendanceStatus-error`} message={error('attendanceStatus')} />
        </fieldset>

        {showCounts && (
          <fieldset>
            <legend className="text-sm font-semibold">כמה תגיעו?</legend>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {COUNT_FIELDS.map((field) => (
                <div key={field.name}>
                  <label
                    htmlFor={`${formId}-${field.name}`}
                    className="text-muted-foreground text-sm"
                  >
                    {field.label}
                  </label>
                  <input
                    id={`${formId}-${field.name}`}
                    name={field.name}
                    type="number"
                    min={0}
                    max={30}
                    defaultValue={field.name === 'adultsCount' ? 1 : 0}
                    inputMode="numeric"
                    aria-describedby={describedBy(field.name)}
                    className="border-input mt-1 w-full rounded-lg border px-3 py-2.5 text-center text-base"
                  />
                  <FieldError id={`${formId}-${field.name}-error`} message={error(field.name)} />
                </div>
              ))}
            </div>
          </fieldset>
        )}

        <div>
          <label htmlFor={`${formId}-familySide`} className="block text-sm font-semibold">
            צד משפחה
          </label>
          <select
            id={`${formId}-familySide`}
            name="familySide"
            defaultValue=""
            className="border-input mt-1.5 w-full rounded-lg border px-3 py-2.5 text-base"
          >
            <option value="">לא רלוונטי</option>
            <option value="side_a">{sideALabel}</option>
            <option value="side_b">{sideBLabel}</option>
            <option value="other">אחר</option>
          </select>
        </div>

        <div>
          <label htmlFor={`${formId}-dietaryRequirements`} className="block text-sm font-semibold">
            דרישות תזונה
          </label>
          <input
            id={`${formId}-dietaryRequirements`}
            name="dietaryRequirements"
            type="text"
            maxLength={500}
            aria-describedby={describedBy('dietaryRequirements')}
            className="border-input mt-1.5 w-full rounded-lg border px-3 py-2.5 text-base"
          />
          <FieldError
            id={`${formId}-dietaryRequirements-error`}
            message={error('dietaryRequirements')}
          />
        </div>

        <div>
          <label htmlFor={`${formId}-notes`} className="block text-sm font-semibold">
            הערות
          </label>
          <textarea
            id={`${formId}-notes`}
            name="notes"
            rows={3}
            maxLength={1000}
            aria-describedby={describedBy('notes')}
            className="border-input mt-1.5 w-full rounded-lg border px-3 py-2.5 text-base"
          />
          <FieldError id={`${formId}-notes-error`} message={error('notes')} />
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="consent"
              required
              aria-describedby={describedBy('consent')}
              className="accent-primary mt-1 size-4 shrink-0"
            />
            <span className="text-muted-foreground text-sm">
              אני מאשר/ת שהפרטים שמסרתי — כולל דרישות תזונה, שעשויות להעיד על מצב רפואי או על אורח
              חיים — יישמרו לצורך ארגון האירוע בלבד, ויימחקו לאחריו.
            </span>
          </label>
          <FieldError id={`${formId}-consent-error`} message={error('consent')} />
        </div>

        {state.status === 'error' && state.message !== '' && (
          <p role="alert" className="text-destructive text-center text-sm">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground w-full rounded-lg px-6 py-3 text-base font-semibold disabled:opacity-60"
        >
          {isPending ? UI_MESSAGES.rsvp.submitting : UI_MESSAGES.rsvp.submit}
        </button>
      </form>
    </section>
  );
}
