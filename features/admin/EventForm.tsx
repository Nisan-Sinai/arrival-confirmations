'use client';

import { useActionState, useState } from 'react';

import type { EventFormState } from '@/app/actions/manageEvent';
import { Button } from '@/components/ui/button';
import { CheckboxField, Field, Input, Select, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { getEventTypePreset, listEventTypePresets } from '@/config/eventTypes';

/**
 * Create and edit an event (§8).
 *
 * One component for both, because the two differ only in their defaults and which
 * action they post to. Keeping them identical means a field added for creation is
 * automatically editable, which is the failure this shape prevents.
 *
 * Two things changed here beyond the styling.
 *
 * Every control now sits inside `<Field>`, so an error is bound to its input by
 * `aria-describedby` and marked with `aria-invalid`. Before this the errors rendered
 * as loose paragraphs: a sighted user saw red text under the right box, and a screen
 * reader user was moved to a rejected field and told nothing.
 *
 * The form also redraws with what was typed. React resets an uncontrolled form once
 * its action resolves, so a host who left the venue blank previously lost the date,
 * both times, the map links and the invitation note along with it.
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
  readonly expected_guests: number | null;
  readonly is_active: boolean;
}

interface EventFormProps {
  readonly action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  readonly submitLabel: string;
  readonly defaults?: Partial<EventFormValues>;
}

/** A hairline heading that groups the fields below it. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-border border-t pt-7 first:border-t-0 first:pt-0">
      <legend className="text-eyebrow text-accent-strong -mt-2.5 pe-3 font-semibold">
        {title}
      </legend>
      <div className="space-y-5">{children}</div>
    </fieldset>
  );
}

export function EventForm({ action, submitLabel, defaults = {} }: EventFormProps) {
  const [state, formAction, isPending] = useActionState(action, INITIAL);
  const presets = listEventTypePresets();
  const err = (field: string) => state.fieldErrors[field];

  // Values the server echoed back after a rejection win over the row loaded from the
  // database: they are what the host last typed.
  const submitted = state.values;
  const value = <K extends keyof EventFormValues>(key: K): string => {
    const fromSubmission = submitted?.[key as keyof typeof submitted];
    if (fromSubmission !== undefined && fromSubmission !== null) return String(fromSubmission);
    const fromDefaults = defaults[key];
    return fromDefaults === undefined || fromDefaults === null ? '' : String(fromDefaults);
  };

  /**
   * The chosen type, tracked only so the two side-label hints can name that type's
   * defaults. Showing "ריק = ברירת המחדל" told a host nothing; showing "ריק = צד
   * החתן" tells them exactly what the guest will see.
   */
  const [eventType, setEventType] = useState(() => value('event_type') || 'other');
  const preset = getEventTypePreset(eventType);

  const isPublished =
    submitted?.is_active ?? (defaults.is_active === undefined ? true : defaults.is_active);

  return (
    <form action={formAction} className="space-y-8" noValidate>
      {defaults.id !== undefined && <input type="hidden" name="eventId" value={defaults.id} />}

      <Group title="האירוע">
        <Field label="סוג האירוע" required error={err('eventType')}>
          <Select
            name="eventType"
            defaultValue={value('event_type') || 'other'}
            onChange={(event) => setEventType(event.target.value)}
          >
            {presets.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="כותרת פנימית"
          required
          error={err('title')}
          hint="לזיהוי בדשבורד בלבד; האורחים לא רואים אותה."
        >
          <Input name="title" defaultValue={value('title')} placeholder="הברית של יונתן" />
        </Field>

        <Field label={preset.hostsLabel} required error={err('hostsNames')}>
          <Input name="hostsNames" defaultValue={value('hosts_names')} />
        </Field>

        <Field label={preset.honoreeLabel} required error={err('honoreeDisplayName')}>
          <Input name="honoreeDisplayName" defaultValue={value('honoree_display_name')} />
        </Field>
      </Group>

      <Group title="מתי">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="תאריך" required error={err('eventDate')}>
            <Input name="eventDate" type="date" defaultValue={value('event_date')} />
          </Field>
          <Field label={preset.ceremonyTimeLabel}>
            <Input
              name="ceremonyTime"
              type="time"
              defaultValue={value('ceremony_time').slice(0, 5)}
            />
          </Field>
          <Field label="קבלת פנים">
            <Input
              name="receptionTime"
              type="time"
              defaultValue={value('reception_time').slice(0, 5)}
            />
          </Field>
        </div>
      </Group>

      <Group title="איפה">
        <Field label="שם המקום" required error={err('venueName')}>
          <Input name="venueName" defaultValue={value('venue_name')} placeholder="אולמי הדר" />
        </Field>

        <Field label="כתובת" required error={err('address')}>
          <Input name="address" defaultValue={value('address')} placeholder="הרצל 12, פתח תקווה" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="קישור Waze" hint="חייב להתחיל ב-https://">
            <Input
              name="wazeUrl"
              type="url"
              dir="ltr"
              className="text-start"
              defaultValue={value('waze_url')}
            />
          </Field>
          <Field label="קישור Google Maps" hint="חייב להתחיל ב-https://">
            <Input
              name="googleMapsUrl"
              type="url"
              dir="ltr"
              className="text-start"
              defaultValue={value('google_maps_url')}
            />
          </Field>
        </div>
      </Group>

      <Group title="פרטים להזמנה">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="תווית צד א׳" hint={`ריק = ${preset.defaultSideALabel}`}>
            <Input name="sideALabel" defaultValue={value('side_a_label')} />
          </Field>
          <Field label="תווית צד ב׳" hint={`ריק = ${preset.defaultSideBLabel}`}>
            <Input name="sideBLabel" defaultValue={value('side_b_label')} />
          </Field>
        </div>

        <Field label="טלפון לבירורים" hint="מוצג לאורחים בתחתית ההזמנה">
          <Input
            name="contactPhone"
            type="tel"
            dir="ltr"
            className="text-start"
            placeholder="050-1234567"
            defaultValue={value('contact_phone')}
          />
        </Field>

        <Field label="הערה להזמנה" hint="למשל: חניה חינם במקום, או קוד לבוש">
          <Textarea name="description" rows={3} defaultValue={value('description')} />
        </Field>
      </Group>

      <Group title="מעקב">
        {/* The denominator for the response-rate tile. Optional, and the tile says
            "not available" without it rather than inventing a figure (§8.1). */}
        <Field
          label="כמה הזמנות שלחתם"
          hint="לא חובה. משמש רק לחישוב אחוז המענה בדשבורד, ולא מוצג לאורחים."
        >
          <Input
            name="expectedGuests"
            type="number"
            min={1}
            max={5000}
            inputMode="numeric"
            placeholder="למשל 120"
            defaultValue={value('expected_guests')}
          />
        </Field>
      </Group>

      <Group title="פרסום">
        <CheckboxField name="isActive" defaultChecked={isPublished}>
          פרסום ההזמנה. כשהתיבה מסומנת הקישור פתוח לאורחים; אחרת הוא מחזיר 404, ואף אחד לא יכול לאשר
          הגעה.
        </CheckboxField>
      </Group>

      {state.status === 'error' && state.message !== '' && (
        <Alert tone="error">{state.message}</Alert>
      )}
      {state.status === 'error' && state.message === '' && (
        <Alert tone="error">יש שדות חסרים או שגויים. הם מסומנים למעלה.</Alert>
      )}

      <Button type="submit" size="lg" block disabled={isPending}>
        {isPending ? 'שומר…' : submitLabel}
      </Button>
    </form>
  );
}
