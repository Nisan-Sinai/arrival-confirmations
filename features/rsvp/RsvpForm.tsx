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
import { getAppCopy } from '@/config/appCopy';
import { getDictionary } from '@/config/dictionary';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';

const INITIAL_STATE: RsvpFormState = { status: 'idle', message: '', fieldErrors: {} };

interface RsvpFormProps {
  readonly eventId: string;
  readonly sideALabel: string;
  readonly sideBLabel: string;
}

export function RsvpForm({ eventId, sideALabel, sideBLabel }: RsvpFormProps) {
  const locale = useAppLocale();
  const copy = getAppCopy(locale).rsvp;
  const dictionary = getDictionary(locale);
  const countFields = [
    { name: 'adultsCount', label: copy.adults, fallback: '1' },
    { name: 'childrenCount', label: copy.children, fallback: '0' },
    { name: 'babiesCount', label: copy.babies, fallback: '0' },
  ] as const;
  const statusOptions = [
    { value: 'attending', label: copy.attending },
    { value: 'maybe', label: copy.maybe },
    { value: 'not_attending', label: copy.notAttending },
  ] as const;

  const [state, formAction, isPending] = useActionState<RsvpFormState, FormData>(
    submitRsvpAction,
    INITIAL_STATE,
  );
  const submittedStatus = state.values?.attendanceStatus;
  const [status, setStatus] = useState('attending');
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
        <span
          aria-hidden="true"
          className="border-success/40 text-success mx-auto flex size-16 items-center justify-center rounded-full border"
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
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
        <div aria-live="polite">
          <h2 className="text-h2 text-primary mt-6 font-bold">{dictionary.rsvp.successTitle}</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">{state.message}</p>
        </div>
        <Rule className="mt-8" />
      </Card>
    );
  }

  const error = (field: string) => state.fieldErrors[field];
  const previous = state.values;
  const showCounts = status !== 'not_attending';

  return (
    <Card padding="lg" className="relative">
      <div className="text-center">
        <p className="text-eyebrow text-accent-strong font-semibold">{copy.eyebrow}</p>
        <h2 className="text-h2 text-primary mt-2 font-bold">{copy.title}</h2>
      </div>

      <Rule className="my-7" />

      <form action={formAction} className="space-y-6" noValidate>
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="locale" value={locale} />
        <div
          aria-hidden="true"
          className="absolute h-px w-px overflow-hidden"
          style={{ clipPath: 'inset(50%)' }}
        >
          <label htmlFor="rsvp-company">{copy.honeypot}</label>
          <input id="rsvp-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <Field label={copy.fullName} required error={error('fullName')}>
          <Input
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder={copy.fullNamePlaceholder}
            defaultValue={previous?.fullName ?? ''}
          />
        </Field>

        <Field label={copy.phone} required error={error('phone')} hint={copy.phoneHint}>
          <Input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="050-1234567"
            className="text-start"
            defaultValue={previous?.phone ?? ''}
          />
        </Field>

        <fieldset>
          <legend className="text-primary text-sm font-semibold">
            {copy.attendanceLegend}
            <span aria-hidden="true" className="text-accent-strong ms-1">
              *
            </span>
            <span className="sr-only"> {copy.required}</span>
          </legend>
          <div className="mt-2 space-y-2.5">
            {statusOptions.map((option) => (
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
            <legend className="text-primary text-sm font-semibold">{copy.countLegend}</legend>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {countFields.map((field) => (
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

        <Field label={copy.familySide}>
          <Select key={submissionKey} name="familySide" defaultValue={previous?.familySide ?? ''}>
            <option value="">{copy.notRelevant}</option>
            <option value="side_a">{sideALabel}</option>
            <option value="side_b">{sideBLabel}</option>
            <option value="other">{copy.other}</option>
          </Select>
        </Field>

        <Field label={copy.dietary} error={error('dietaryRequirements')} hint={copy.dietaryHint}>
          <Input
            name="dietaryRequirements"
            type="text"
            maxLength={500}
            defaultValue={previous?.dietaryRequirements ?? ''}
          />
        </Field>

        <Field label={copy.notes} error={error('notes')}>
          <Textarea name="notes" rows={3} maxLength={1000} defaultValue={previous?.notes ?? ''} />
        </Field>

        <CheckboxField name="consent" required error={error('consent')}>
          {copy.consent}
        </CheckboxField>

        {state.status === 'error' && state.message !== '' && (
          <Alert tone="error">{state.message}</Alert>
        )}

        <Button type="submit" size="lg" block disabled={isPending}>
          {isPending ? dictionary.rsvp.submitting : dictionary.rsvp.submit}
        </Button>

        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          {copy.privacy}
        </p>
      </form>
    </Card>
  );
}
