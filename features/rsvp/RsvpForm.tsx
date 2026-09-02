'use client';

import { useActionState, useState } from 'react';

import {
  submitRsvpAction,
  type RsvpFormState,
  type RsvpFormValues,
} from '@/app/actions/submitRsvp';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckboxField, Field, Input, RadioCard, Select, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { Rule } from '@/components/ui/layout';
import { UI_MESSAGES } from '@/config/messages';
import { WrittenHeading } from '@/features/landing/WrittenHeading';
import { AddToCalendar } from '@/features/invite/AddToCalendar';

/**
 * The public RSVP form (§6, §9).
 *
 * `useActionState` keeps the whole thing working before hydration: the browser posts
 * the form natively and the Server Action still runs. That matters here more than in
 * most apps — a guest on a weak connection at a venue should be able to answer before
 * the JavaScript finishes loading.
 */

/**
 * Declared here rather than beside the action: a 'use server' module may only export
 * async functions, so a plain object exported from it arrives as undefined on the
 * client and the first render crashes reading state.fieldErrors.
 */
const INITIAL_STATE: RsvpFormState = { status: 'idle', message: '', fieldErrors: {} };

const COUNT_FIELDS = [
  { name: 'adultsCount', label: 'מבוגרים', fallback: '1' },
  { name: 'childrenCount', label: 'ילדים', fallback: '0' },
  { name: 'babiesCount', label: 'תינוקות', fallback: '0' },
] as const;

const STATUS_OPTIONS = [
  { value: 'attending', label: 'נגיע בשמחה' },
  { value: 'maybe', label: 'עדיין לא בטוח' },
  { value: 'not_attending', label: 'לא נוכל להגיע' },
] as const;

interface RsvpFormProps {
  readonly eventId: string;
  readonly sideALabel: string;
  readonly sideBLabel: string;
  /**
   * Everything needed to offer the calendar entry once the answer is in.
   *
   * Optional because the form has one other caller — the component test — and a
   * required prop there would be four lines of fixture for a branch it is not testing.
   * Absent, the success card is what it was.
   */
  readonly calendar?: {
    readonly uid: string;
    readonly title: string;
    readonly date: string;
    readonly time: string | null;
    readonly venueName: string;
    readonly address: string;
  };
}

export function RsvpForm({ eventId, sideALabel, sideBLabel, calendar }: RsvpFormProps) {
  const [state, formAction, isPending] = useActionState<RsvpFormState, FormData>(
    submitRsvpAction,
    INITIAL_STATE,
  );

  /**
   * Which answer is selected, mirrored into state only because the count fields are
   * shown or hidden by it.
   *
   * The reconciliation below is React's documented "adjusting state when a prop
   * changes" pattern, and it is here for a specific failure: React resets the form's
   * DOM once the action resolves, so a guest who selected "we cannot come" and then
   * tripped validation got the radio back at its default while this state still said
   * `not_attending` — the counters stayed hidden under a selection that no longer
   * existed. Re-seeding from the echoed submission keeps the two in step.
   */
  const submittedStatus = state.values?.attendanceStatus;
  const [status, setStatus] = useState('attending');
  /**
   * Bumped once per echoed submission, and used as a `key` on the one control that
   * cannot redraw without being remounted — see the family-side field below.
   */
  const [submissionKey, setSubmissionKey] = useState(0);
  const [seenSubmission, setSeenSubmission] = useState<RsvpFormValues | undefined>(undefined);
  if (state.values !== seenSubmission) {
    setSeenSubmission(state.values);
    setSubmissionKey((n) => n + 1);
    if (submittedStatus !== undefined && submittedStatus !== '') setStatus(submittedStatus);
  }

  if (state.status === 'success') {
    return (
      <Card padding="lg" className="border-success/30 text-center">
        {/*
          The ring settles, then the tick draws itself.

          A guest has just told a family they are coming. The answer to that used to be a
          static glyph appearing at once, which reads like a receipt. Both classes carry
          real durations, so the `prefers-reduced-motion` override in `globals.css`
          collapses them and the mark simply appears for anyone who asked for stillness.
        */}
        <span
          aria-hidden="true"
          className="border-success/40 text-success confirm-ring mx-auto flex size-16 items-center justify-center rounded-full border"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-7"
          >
            <path className="confirm-tick" d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
        {/* §9: aria-live so a screen reader announces the outcome after submission. */}
        <div aria-live="polite">
          <h2 className="text-h2 text-primary mt-6 font-bold">{UI_MESSAGES.rsvp.successTitle}</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">{state.message}</p>
        </div>

        {/*
          The one thing to offer a guest who has just said yes.

          This card used to end at the rule below — a tick, a sentence, and nothing to do.
          But the moment someone has just told a family they are coming is exactly the
          moment the date is worth saving, and the calendar entry was already built and
          sitting on the invitation further up the page. A guest who has scrolled down,
          filled in a form and submitted it is not going to scroll back for it.

          Which matters because this is the product's whole job. Every reply is a promise
          made weeks before the day, against a date the guest has written down nowhere.
          An entry in their calendar is the difference between a confirmed guest and one
          who meant to come.
        */}
        {calendar !== undefined && (
          <div className="mt-7 flex justify-center">
            <AddToCalendar
              uid={calendar.uid}
              title={calendar.title}
              date={calendar.date}
              time={calendar.time}
              venueName={calendar.venueName}
              address={calendar.address}
            />
          </div>
        )}

        <Rule draw="load" className="mt-8" />
      </Card>
    );
  }

  const error = (field: string) => state.fieldErrors[field];
  const previous = state.values;

  // Counts are meaningless once a guest has declined, so they are hidden rather than
  // left to be filled in and then rejected by a constraint they cannot see.
  const showCounts = status !== 'not_attending';

  return (
    <Card padding="lg" className="relative">
      <div className="text-center">
        <p className="text-eyebrow text-accent-strong font-semibold">נשמח לדעת</p>
        <h2 className="text-h2 text-primary mt-2 font-bold">
          <WrittenHeading text="אישור הגעה" />
        </h2>
      </div>

      <Rule draw="load" className="my-7" />

      <form action={formAction} className="space-y-6" noValidate>
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
          <label htmlFor="rsvp-company">אל תמלאו שדה זה</label>
          <input id="rsvp-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <Field label="שם מלא" required error={error('fullName')}>
          <Input
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="ישראל ישראלי"
            defaultValue={previous?.fullName ?? ''}
          />
        </Field>

        <Field label="טלפון" required error={error('phone')} hint="לעדכונים על האירוע בלבד">
          <Input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="050-1234567"
            // Typed left-to-right but aligned to the start of an RTL line, so the
            // field reads in the same column as every other label on the form.
            className="text-start"
            defaultValue={previous?.phone ?? ''}
          />
        </Field>

        {/* A radiogroup rather than a select: three options are faster to tap than a
            dropdown, and the choice stays visible while the rest is filled in. */}
        <fieldset>
          <legend className="text-primary text-sm font-semibold">
            האם תגיעו?
            <span aria-hidden="true" className="text-accent-strong ms-1">
              *
            </span>
            <span className="sr-only"> (שדה חובה)</span>
          </legend>
          <div className="mt-2 space-y-2.5">
            {STATUS_OPTIONS.map((option) => (
              <RadioCard
                key={option.value}
                name="attendanceStatus"
                value={option.value}
                label={option.label}
                defaultChecked={option.value === status}
                onChange={setStatus}
              />
            ))}
          </div>
          {error('attendanceStatus') !== undefined && (
            <p role="alert" className="text-destructive mt-1.5 text-sm font-medium">
              {error('attendanceStatus')}
            </p>
          )}
        </fieldset>

        {showCounts && (
          <fieldset>
            <legend className="text-primary text-sm font-semibold">כמה תגיעו?</legend>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {COUNT_FIELDS.map((field) => (
                <Field key={field.name} label={field.label} error={error(field.name)}>
                  <Input
                    name={field.name}
                    type="number"
                    min={0}
                    max={30}
                    inputMode="numeric"
                    className="text-center"
                    defaultValue={previous?.[field.name] ?? field.fallback}
                  />
                </Field>
              ))}
            </div>
          </fieldset>
        )}

        <Field label="צד משפחה">
          {/*
            The `key` is what makes this field survive a rejection, and it is the only
            control on the form that needs one. React applies `defaultValue` to a
            `<select>` at mount and never again, and it resets the form once the action
            resolves — so a changed default reaches the text inputs but leaves this one
            sitting on "לא רלוונטי". Making it controlled does not help either: the
            reset lands after the re-render and puts it back. Remounting per submission
            re-applies the default as a `selected` attribute, which is what the reset
            itself then restores, so the two stop fighting.

            The guest-visible bug: someone picks "צד הכלה", mistypes their phone, and
            gets the form back with the side silently cleared. They resubmit without
            noticing and the host seats them with the wrong family.
          */}
          <Select key={submissionKey} name="familySide" defaultValue={previous?.familySide ?? ''}>
            <option value="">לא רלוונטי</option>
            <option value="side_a">{sideALabel}</option>
            <option value="side_b">{sideBLabel}</option>
            <option value="other">אחר</option>
          </Select>
        </Field>

        <Field
          label="דרישות תזונה"
          error={error('dietaryRequirements')}
          hint="צמחוני, ללא גלוטן, אלרגיות — כל מה שחשוב שנדע"
        >
          <Input
            name="dietaryRequirements"
            type="text"
            maxLength={500}
            defaultValue={previous?.dietaryRequirements ?? ''}
          />
        </Field>

        <Field label="הערות" error={error('notes')}>
          <Textarea name="notes" rows={3} maxLength={1000} defaultValue={previous?.notes ?? ''} />
        </Field>

        <CheckboxField name="consent" required error={error('consent')}>
          אני מאשר/ת שהפרטים שמסרתי — כולל דרישות תזונה, שעשויות להעיד על מצב רפואי או על אורח חיים
          — יישמרו לצורך ארגון האירוע בלבד, ויימחקו לאחריו.
        </CheckboxField>

        {state.status === 'error' && state.message !== '' && (
          <Alert tone="error">{state.message}</Alert>
        )}

        <Button type="submit" size="lg" block disabled={isPending}>
          {isPending ? UI_MESSAGES.rsvp.submitting : UI_MESSAGES.rsvp.submit}
        </Button>

        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          הפרטים נשמרים אצל בעלי השמחה בלבד ונמחקים לאחר האירוע.
        </p>
      </form>
    </Card>
  );
}
