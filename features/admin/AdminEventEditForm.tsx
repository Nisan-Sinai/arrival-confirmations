'use client';

import { useActionState } from 'react';

import { adminUpdateEventAction, type AdminEventFormState } from '@/app/actions/adminEvents';
import { Button } from '@/components/ui/button';
import { CheckboxField, Field, Input, Select, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { getEventTypePreset, listEventTypePresets } from '@/config/eventTypes';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';

const INITIAL: AdminEventFormState = { status: 'idle', message: '', fieldErrors: {} };

export interface AdminEditableEvent {
  readonly id: string;
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

const COPY = {
  he: {
    event: 'אירוע',
    type: 'סוג אירוע',
    title: 'כותרת פנימית',
    hosts: 'שמות מארחים',
    honoree: 'שם החוגג/ת',
    dateTime: 'תאריך ושעות',
    date: 'תאריך',
    ceremony: 'שעת טקס',
    reception: 'קבלת פנים',
    location: 'מיקום',
    venue: 'שם המקום',
    address: 'כתובת',
    waze: 'קישור Waze',
    maps: 'קישור Google Maps',
    details: 'פרטים נוספים',
    contact: 'טלפון ליצירת קשר',
    sideA: 'שם צד א׳',
    sideB: 'שם צד ב׳',
    expected: 'צפי מוזמנים',
    description: 'תיאור',
    publish: 'מפורסם וזמין לקהל',
    genericError: 'יש שדות שדורשים תיקון.',
    saving: 'שומר…',
    save: 'שמירת שינויים',
  },
  en: {
    event: 'Event',
    type: 'Event type',
    title: 'Internal title',
    hosts: 'Host names',
    honoree: 'Celebrant name',
    dateTime: 'Date & times',
    date: 'Date',
    ceremony: 'Ceremony time',
    reception: 'Reception time',
    location: 'Location',
    venue: 'Venue name',
    address: 'Address',
    waze: 'Waze link',
    maps: 'Google Maps link',
    details: 'Additional details',
    contact: 'Contact phone',
    sideA: 'Side A label',
    sideB: 'Side B label',
    expected: 'Expected guests',
    description: 'Description',
    publish: 'Published and available to guests',
    genericError: 'Some fields need attention.',
    saving: 'Saving…',
    save: 'Save changes',
  },
} as const;

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-border border-t pt-7 first:border-t-0 first:pt-0">
      <legend className="text-eyebrow text-accent-strong -mt-2.5 pe-3 font-semibold">{title}</legend>
      <div className="space-y-5">{children}</div>
    </fieldset>
  );
}

export function AdminEventEditForm({ event }: { readonly event: AdminEditableEvent }) {
  const locale = useAppLocale();
  const copy = COPY[locale];
  const [state, action, pending] = useActionState(adminUpdateEventAction, INITIAL);
  const err = (name: string) => state.fieldErrors[name];
  const preset = getEventTypePreset(event.event_type, locale);

  return (
    <form action={action} className="space-y-8" noValidate>
      <input type="hidden" name="eventId" value={event.id} />
      <input type="hidden" name="locale" value={locale} />

      <Group title={copy.event}>
        <Field label={copy.type} required error={err('eventType')}>
          <Select name="eventType" defaultValue={event.event_type}>
            {listEventTypePresets(locale).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={copy.title} required error={err('title')}>
          <Input name="title" defaultValue={event.title} />
        </Field>
        <Field label={copy.hosts} required error={err('hostsNames')}>
          <Input name="hostsNames" defaultValue={event.hosts_names} />
        </Field>
        <Field label={preset.honoreeLabel || copy.honoree} required error={err('honoreeDisplayName')}>
          <Input name="honoreeDisplayName" defaultValue={event.honoree_display_name} />
        </Field>
      </Group>

      <Group title={copy.dateTime}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={copy.date} required error={err('eventDate')}>
            <Input name="eventDate" type="date" defaultValue={event.event_date} />
          </Field>
          <Field label={copy.ceremony}>
            <Input name="ceremonyTime" type="time" defaultValue={event.ceremony_time?.slice(0, 5) ?? ''} />
          </Field>
          <Field label={copy.reception}>
            <Input name="receptionTime" type="time" defaultValue={event.reception_time?.slice(0, 5) ?? ''} />
          </Field>
        </div>
      </Group>

      <Group title={copy.location}>
        <Field label={copy.venue} required error={err('venueName')}>
          <Input name="venueName" defaultValue={event.venue_name} />
        </Field>
        <Field label={copy.address} required error={err('address')}>
          <Input name="address" defaultValue={event.address} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={copy.waze}>
            <Input name="wazeUrl" dir="ltr" className="text-start" defaultValue={event.waze_url ?? ''} />
          </Field>
          <Field label={copy.maps}>
            <Input name="googleMapsUrl" dir="ltr" className="text-start" defaultValue={event.google_maps_url ?? ''} />
          </Field>
        </div>
      </Group>

      <Group title={copy.details}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={copy.contact}>
            <Input name="contactPhone" type="tel" dir="ltr" className="text-start" defaultValue={event.contact_phone ?? ''} />
          </Field>
          <Field label={copy.expected}>
            <Input name="expectedGuests" type="number" min={1} inputMode="numeric" defaultValue={event.expected_guests ?? ''} />
          </Field>
          <Field label={copy.sideA}>
            <Input name="sideALabel" defaultValue={event.side_a_label ?? ''} />
          </Field>
          <Field label={copy.sideB}>
            <Input name="sideBLabel" defaultValue={event.side_b_label ?? ''} />
          </Field>
        </div>
        <Field label={copy.description}>
          <Textarea name="description" rows={4} defaultValue={event.description ?? ''} />
        </Field>
        <CheckboxField name="isActive" defaultChecked={event.is_active}>
          {copy.publish}
        </CheckboxField>
      </Group>

      {state.status === 'error' && (
        <Alert tone="error">{state.message === '' ? copy.genericError : state.message}</Alert>
      )}
      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? copy.saving : copy.save}
      </Button>
    </form>
  );
}
