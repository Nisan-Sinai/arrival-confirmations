'use client';

import { useActionState, useState } from 'react';

import type { EventFormState } from '@/app/actions/manageEvent';
import { Button } from '@/components/ui/button';
import { CheckboxField, Field, Input, Select, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { getAppCopy } from '@/config/appCopy';
import { getEventTypePreset, listEventTypePresets } from '@/config/eventTypes';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';

const INITIAL: EventFormState = { status: 'idle', message: '', fieldErrors: {} };

export interface EventFormValues {
  readonly id?: string;
  readonly title: string;
  readonly event_type: string;
  readonly hosts_names: string;
  readonly honoree_display_name: string;
  readonly event_date: string;
  readonly ceremony_time: string | null;
  readonly reception_time: string | null;
  readonly venue_name: string;
  readonly address: string;
  readonly waze_url: string | null;
  readonly google_maps_url: string | null;
  readonly contact_phone: string | null;
  readonly description: string | null;
  readonly side_a_label: string | null;
  readonly side_b_label: string | null;
  readonly expected_guests: number | null;
  readonly is_active: boolean;
}

interface EventFormProps {
  readonly action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  readonly submitLabel: string;
  readonly defaults?: Partial<EventFormValues>;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-border border-t pt-7 first:border-t-0 first:pt-0">
      <legend className="text-eyebrow text-accent-strong -mt-2.5 pe-3 font-semibold">{title}</legend>
      <div className="space-y-5">{children}</div>
    </fieldset>
  );
}

export function EventForm({ action, submitLabel, defaults = {} }: EventFormProps) {
  const locale = useAppLocale();
  const copy = getAppCopy(locale).eventForm;
  const [state, formAction, isPending] = useActionState(action, INITIAL);
  const presets = listEventTypePresets(locale);
  const err = (field: string) => state.fieldErrors[field];

  const submitted = state.values;
  const value = <K extends keyof EventFormValues>(key: K): string => {
    const fromSubmission = submitted?.[key as keyof typeof submitted];
    if (fromSubmission !== undefined && fromSubmission !== null) return String(fromSubmission);
    const fromDefaults = defaults[key];
    return fromDefaults === undefined || fromDefaults === null ? '' : String(fromDefaults);
  };

  const [eventType, setEventType] = useState(() => value('event_type') || 'other');
  const [submissionKey, setSubmissionKey] = useState(0);
  const [seenSubmission, setSeenSubmission] = useState<EventFormState['values']>(undefined);
  if (state.values !== seenSubmission) {
    setSeenSubmission(state.values);
    setSubmissionKey((n) => n + 1);
    const submittedType = state.values?.event_type;
    if (submittedType !== undefined && submittedType !== null) setEventType(submittedType);
  }
  const preset = getEventTypePreset(eventType, locale);
  const isPublished =
    submitted?.is_active ?? (defaults.is_active === undefined ? true : defaults.is_active);

  return (
    <form action={formAction} className="space-y-8" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {defaults.id !== undefined && <input type="hidden" name="eventId" value={defaults.id} />}

      <Group title={copy.eventGroup}>
        <Field label={copy.eventType} required error={err('eventType')}>
          <Select
            key={submissionKey}
            name="eventType"
            defaultValue={eventType}
            onChange={(event) => setEventType(event.target.value)}
          >
            {presets.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={copy.internalTitle} required error={err('title')} hint={copy.internalTitleHint}>
          <Input name="title" defaultValue={value('title')} placeholder={copy.internalTitlePlaceholder} />
        </Field>

        <Field label={preset.hostsLabel} required error={err('hostsNames')}>
          <Input name="hostsNames" defaultValue={value('hosts_names')} />
        </Field>

        <Field label={preset.honoreeLabel} required error={err('honoreeDisplayName')}>
          <Input name="honoreeDisplayName" defaultValue={value('honoree_display_name')} />
        </Field>
      </Group>

      <Group title={copy.whenGroup}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={copy.date} required error={err('eventDate')}>
            <Input name="eventDate" type="date" defaultValue={value('event_date')} />
          </Field>
          <Field label={preset.ceremonyTimeLabel}>
            <Input name="ceremonyTime" type="time" defaultValue={value('ceremony_time').slice(0, 5)} />
          </Field>
          <Field label={copy.reception}>
            <Input name="receptionTime" type="time" defaultValue={value('reception_time').slice(0, 5)} />
          </Field>
        </div>
      </Group>

      <Group title={copy.whereGroup}>
        <Field label={copy.venue} required error={err('venueName')}>
          <Input name="venueName" defaultValue={value('venue_name')} placeholder={copy.venuePlaceholder} />
        </Field>

        <Field label={copy.address} required error={err('address')}>
          <Input name="address" defaultValue={value('address')} placeholder={copy.addressPlaceholder} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={copy.wazeLink} hint={copy.httpsHint}>
            <Input name="wazeUrl" type="url" dir="ltr" className="text-start" defaultValue={value('waze_url')} />
          </Field>
          <Field label={copy.mapsLink} hint={copy.httpsHint}>
            <Input name="googleMapsUrl" type="url" dir="ltr" className="text-start" defaultValue={value('google_maps_url')} />
          </Field>
        </div>
      </Group>

      <Group title={copy.invitationGroup}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={copy.sideA} hint={`${copy.emptyEquals} ${preset.defaultSideALabel}`}>
            <Input name="sideALabel" defaultValue={value('side_a_label')} />
          </Field>
          <Field label={copy.sideB} hint={`${copy.emptyEquals} ${preset.defaultSideBLabel}`}>
            <Input name="sideBLabel" defaultValue={value('side_b_label')} />
          </Field>
        </div>

        <Field label={copy.contactPhone} hint={copy.contactPhoneHint}>
          <Input
            name="contactPhone"
            type="tel"
            dir="ltr"
            className="text-start"
            placeholder="050-1234567"
            defaultValue={value('contact_phone')}
          />
        </Field>

        <Field label={copy.description} hint={copy.descriptionHint}>
          <Textarea name="description" rows={3} defaultValue={value('description')} />
        </Field>
      </Group>

      <Group title={copy.trackingGroup}>
        <Field label={copy.expectedGuests} hint={copy.expectedGuestsHint}>
          <Input
            name="expectedGuests"
            type="number"
            min={1}
            max={5000}
            inputMode="numeric"
            placeholder={copy.expectedGuestsPlaceholder}
            defaultValue={value('expected_guests')}
          />
        </Field>
      </Group>

      <Group title={copy.publishingGroup}>
        <CheckboxField name="isActive" defaultChecked={isPublished}>
          {copy.publish}
        </CheckboxField>
      </Group>

      {state.status === 'error' && state.message !== '' && <Alert tone="error">{state.message}</Alert>}
      {state.status === 'error' && state.message === '' && (
        <Alert tone="error">{copy.genericFieldsError}</Alert>
      )}

      <Button type="submit" size="lg" block disabled={isPending}>
        {isPending ? copy.saving : submitLabel}
      </Button>
    </form>
  );
}
