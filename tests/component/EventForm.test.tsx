import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { EventFormState } from '@/app/actions/manageEvent';
import { EventForm } from '@/features/admin/EventForm';

/**
 * The host's create/edit form (§8).
 *
 * The action arrives as a prop here, so nothing needs stubbing at the module level —
 * which is itself the reason the component takes it that way: one component serves
 * both creating and editing, and the two differ only in their defaults and where they
 * post.
 *
 * Two behaviours are worth holding down. The wording follows the event type, because
 * "שם הבן" and "שמות בני הזוג" are the same field and a host filling in the wrong one
 * publishes an invitation that reads wrong. And a rejection redraws what was typed,
 * for the same reason as on the guest form — losing a filled-in date because the venue
 * was blank is how a host gives up halfway.
 */

const IDLE: EventFormState = { status: 'idle', message: '', fieldErrors: {} };

function renderForm(result: EventFormState = IDLE, defaults = {}) {
  const action = vi.fn((_state: EventFormState, _formData: FormData) => Promise.resolve(result));
  render(<EventForm action={action} submitLabel="יצירת אירוע" defaults={defaults} />);
  return { action };
}

const submit = (label = 'יצירת אירוע') => screen.getByRole('button', { name: label });

describe('EventForm', () => {
  it('defaults to the neutral event type', () => {
    renderForm();

    expect(screen.getByLabelText(/סוג האירוע/)).toHaveValue('other');
    expect(screen.getByLabelText(/שם החוגג/)).toBeInTheDocument();
  });

  /** The preset supplies wording only; every concrete value still lives on the row. */
  it('relabels the people fields when the host picks a different event type', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/סוג האירוע/), 'brit_mila');

    expect(screen.getByLabelText(/שם הבן/)).toBeInTheDocument();
    expect(screen.getByLabelText(/שמות ההורים/)).toBeInTheDocument();
    expect(screen.getByLabelText('שעת הברית')).toBeInTheDocument();
  });

  /** "ריק = ברירת המחדל" tells a host nothing; the actual default tells them what a guest sees. */
  it('names the side labels a guest will see when the fields are left empty', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/סוג האירוע/), 'wedding');

    expect(screen.getByLabelText(/תווית צד א׳/)).toHaveAccessibleDescription(/ריק = צד החתן/);
    expect(screen.getByLabelText(/תווית צד ב׳/)).toHaveAccessibleDescription(/ריק = צד הכלה/);
  });

  it('loads an existing event into the form', () => {
    renderForm(IDLE, {
      id: 'event-1',
      title: 'הברית של יונתן',
      event_type: 'brit_mila',
      hosts_names: 'משפחת כהן',
      honoree_display_name: 'יונתן',
      event_date: '2026-09-04',
      // Postgres hands back `HH:MM:SS`; the input takes `HH:MM`.
      ceremony_time: '09:30:00',
      venue_name: 'בית הכנסת המרכזי',
      expected_guests: 120,
    });

    expect(screen.getByLabelText(/כותרת פנימית/)).toHaveValue('הברית של יונתן');
    expect(screen.getByLabelText(/סוג האירוע/)).toHaveValue('brit_mila');
    expect(screen.getByLabelText(/תאריך/)).toHaveValue('2026-09-04');
    expect(screen.getByLabelText('שעת הברית')).toHaveValue('09:30');
    expect(screen.getByLabelText(/כמה הזמנות שלחתם/)).toHaveValue(120);
  });

  /** New events are published by default; an existing unpublished one must stay off. */
  it('respects the stored publication state', () => {
    renderForm(IDLE, { id: 'event-1', is_active: false });

    expect(screen.getByRole('checkbox', { name: /פרסום ההזמנה/ })).not.toBeChecked();
  });

  it('publishes by default when creating', () => {
    renderForm();

    expect(screen.getByRole('checkbox', { name: /פרסום ההזמנה/ })).toBeChecked();
  });

  describe('after a rejected submission', () => {
    it('redraws the fields the host had already filled in', async () => {
      const user = userEvent.setup();
      renderForm({
        status: 'error',
        message: '',
        fieldErrors: { venueName: 'נא למלא את שם המקום' },
        values: {
          title: 'החתונה של דנה',
          event_type: 'wedding',
          hosts_names: 'משפחות לוי וכהן',
          honoree_display_name: 'דנה ויונתן',
          event_date: '2026-08-12',
          ceremony_time: '19:30:00',
          reception_time: '18:30:00',
          venue_name: '',
          address: 'הרצל 12, פתח תקווה',
          waze_url: null,
          google_maps_url: null,
          contact_phone: null,
          description: 'חניה חינם במקום',
          side_a_label: null,
          side_b_label: null,
          expected_guests: 250,
          is_active: true,
        } as EventFormState['values'],
      });

      await user.click(submit());

      await waitFor(() => {
        expect(screen.getByLabelText(/תאריך/)).toHaveValue('2026-08-12');
      });
      // The dropdown itself, not only the wording it drives: React applies a
      // `<select>`'s default at mount and never again, then resets the form once the
      // action resolves, so this is the one control that silently reverted.
      expect(screen.getByLabelText(/סוג האירוע/)).toHaveValue('wedding');
      expect(screen.getByLabelText(/כותרת פנימית/)).toHaveValue('החתונה של דנה');
      expect(screen.getByLabelText(/כתובת/)).toHaveValue('הרצל 12, פתח תקווה');
      expect(screen.getByLabelText('שעת החופה')).toHaveValue('19:30');
      expect(screen.getByLabelText(/קבלת פנים/)).toHaveValue('18:30');
      expect(screen.getByLabelText(/הערה להזמנה/)).toHaveValue('חניה חינם במקום');
      expect(screen.getByLabelText(/כמה הזמנות שלחתם/)).toHaveValue(250);
    });

    /** §9: bound to the input, not left as a loose paragraph beneath it. */
    it('binds the message to the field it is about', async () => {
      const user = userEvent.setup();
      renderForm({
        status: 'error',
        message: '',
        fieldErrors: { venueName: 'נא למלא את שם המקום' },
      });

      await user.click(submit());

      await waitFor(() => {
        expect(screen.getByLabelText(/שם המקום/)).toHaveAttribute('aria-invalid', 'true');
      });
      expect(screen.getByLabelText(/שם המקום/)).toHaveAccessibleDescription(/נא למלא את שם המקום/);
    });

    /**
     * A rejection with no summary message would otherwise render a form that simply
     * did not submit, with the reason only visible to whoever scrolls back up.
     */
    it('says something at form level even when only fields were rejected', async () => {
      const user = userEvent.setup();
      renderForm({
        status: 'error',
        message: '',
        fieldErrors: { venueName: 'נא למלא את שם המקום' },
      });

      await user.click(submit());

      await waitFor(() => {
        expect(screen.getByText('יש שדות חסרים או שגויים. הם מסומנים למעלה.')).toBeInTheDocument();
      });
    });

    it('shows the server message when there is one', async () => {
      const user = userEvent.setup();
      renderForm({ status: 'error', message: 'אין לכם הרשאה לצפות בעמוד זה.', fieldErrors: {} });

      await user.click(submit());

      await waitFor(() => {
        expect(screen.getByText('אין לכם הרשאה לצפות בעמוד זה.')).toBeInTheDocument();
      });
    });
  });

  it('carries the event id so an edit updates rather than creates', () => {
    const { container } = render(
      <EventForm
        action={() => Promise.resolve(IDLE)}
        submitLabel="שמירה"
        defaults={{ id: 'event-1' }}
      />,
    );

    expect(container.querySelector('input[name="eventId"]')).toHaveValue('event-1');
  });
});
