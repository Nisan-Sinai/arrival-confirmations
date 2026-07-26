'use client';

import { useActionState, useId } from 'react';

import type { EventFormState } from '@/app/actions/manageEvent';
import { listEventTypePresets } from '@/config/eventTypes';

/**
 * Create and edit an event (§8).
 *
 * One component for both, because the two differ only in their defaults and which
 * action they post to. Keeping them identical means a field added for creation is
 * automatically editable, which is the failure this shape prevents.
 */

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
  readonly is_active: boolean;
}

interface EventFormProps {
  readonly action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  readonly submitLabel: string;
  readonly defaults?: Partial<EventFormValues>;
}

function Field({
  id,
  label,
  error,
  children,
  hint,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint !== undefined && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      {error !== undefined && (
        <p role="alert" className="text-destructive mt-1 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = 'border-input mt-1.5 w-full rounded-lg border px-3 py-2.5 text-base';

export function EventForm({ action, submitLabel, defaults = {} }: EventFormProps) {
  const [state, formAction, isPending] = useActionState(action, INITIAL);
  const uid = useId();
  const presets = listEventTypePresets();
  const err = (field: string) => state.fieldErrors[field];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {defaults.id !== undefined && <input type="hidden" name="eventId" value={defaults.id} />}

      <Field id={`${uid}-type`} label="סוג האירוע" error={err('eventType')}>
        <select
          id={`${uid}-type`}
          name="eventType"
          defaultValue={defaults.event_type ?? 'other'}
          className={inputClass}
        >
          {presets.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id={`${uid}-title`}
        label="כותרת פנימית"
        error={err('title')}
        hint="לזיהוי בדשבורד בלבד; האורחים לא רואים אותה."
      >
        <input
          id={`${uid}-title`}
          name="title"
          defaultValue={defaults.title ?? ''}
          className={inputClass}
        />
      </Field>

      <Field id={`${uid}-hosts`} label="שמות המארחים" error={err('hostsNames')}>
        <input
          id={`${uid}-hosts`}
          name="hostsNames"
          defaultValue={defaults.hosts_names ?? ''}
          className={inputClass}
        />
      </Field>

      <Field id={`${uid}-honoree`} label="שם החוגג/ת" error={err('honoreeDisplayName')}>
        <input
          id={`${uid}-honoree`}
          name="honoreeDisplayName"
          defaultValue={defaults.honoree_display_name ?? ''}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id={`${uid}-date`} label="תאריך" error={err('eventDate')}>
          <input
            id={`${uid}-date`}
            name="eventDate"
            type="date"
            defaultValue={defaults.event_date ?? ''}
            className={inputClass}
          />
        </Field>
        <Field id={`${uid}-ceremony`} label="שעת הטקס">
          <input
            id={`${uid}-ceremony`}
            name="ceremonyTime"
            type="time"
            defaultValue={defaults.ceremony_time?.slice(0, 5) ?? ''}
            className={inputClass}
          />
        </Field>
        <Field id={`${uid}-reception`} label="קבלת פנים">
          <input
            id={`${uid}-reception`}
            name="receptionTime"
            type="time"
            defaultValue={defaults.reception_time?.slice(0, 5) ?? ''}
            className={inputClass}
          />
        </Field>
      </div>

      <Field id={`${uid}-venue`} label="שם המקום" error={err('venueName')}>
        <input
          id={`${uid}-venue`}
          name="venueName"
          defaultValue={defaults.venue_name ?? ''}
          className={inputClass}
        />
      </Field>

      <Field id={`${uid}-address`} label="כתובת" error={err('address')}>
        <input
          id={`${uid}-address`}
          name="address"
          defaultValue={defaults.address ?? ''}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${uid}-waze`} label="קישור Waze" hint="חייב להתחיל ב-https://">
          <input
            id={`${uid}-waze`}
            name="wazeUrl"
            dir="ltr"
            defaultValue={defaults.waze_url ?? ''}
            className={inputClass}
          />
        </Field>
        <Field id={`${uid}-maps`} label="קישור Google Maps" hint="חייב להתחיל ב-https://">
          <input
            id={`${uid}-maps`}
            name="googleMapsUrl"
            dir="ltr"
            defaultValue={defaults.google_maps_url ?? ''}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${uid}-sidea`} label="תווית צד א׳" hint="ריק = ברירת המחדל של סוג האירוע">
          <input
            id={`${uid}-sidea`}
            name="sideALabel"
            defaultValue={defaults.side_a_label ?? ''}
            className={inputClass}
          />
        </Field>
        <Field id={`${uid}-sideb`} label="תווית צד ב׳" hint="ריק = ברירת המחדל של סוג האירוע">
          <input
            id={`${uid}-sideb`}
            name="sideBLabel"
            defaultValue={defaults.side_b_label ?? ''}
            className={inputClass}
          />
        </Field>
      </div>

      <Field id={`${uid}-phone`} label="טלפון לבירורים">
        <input
          id={`${uid}-phone`}
          name="contactPhone"
          dir="ltr"
          defaultValue={defaults.contact_phone ?? ''}
          className={inputClass}
        />
      </Field>

      <Field id={`${uid}-desc`} label="הערה להזמנה">
        <textarea
          id={`${uid}-desc`}
          name="description"
          rows={3}
          defaultValue={defaults.description ?? ''}
          className={inputClass}
        />
      </Field>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaults.is_active ?? true}
          className="accent-primary mt-1 size-4 shrink-0"
        />
        <span className="text-muted-foreground text-sm">
          פרסום ההזמנה. כשהתיבה מסומנת הקישור פתוח לאורחים; אחרת הוא מחזיר 404.
        </span>
      </label>

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
        {isPending ? 'שומר…' : submitLabel}
      </button>
    </form>
  );
}
