import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RsvpFormState } from '@/app/actions/submitRsvp';

/**
 * The guest-facing form, exercised as a guest uses it (§6, §9).
 *
 * These specs are all about one failure, and it is the most expensive one this product
 * has: React resets an uncontrolled form once its action resolves. A guest who mistyped
 * a phone number used to get the form back empty — name, head counts and dietary note
 * gone — with a red message pointing at the single field they had got wrong. On a phone,
 * at a bus stop, that is not a correction; that is an abandonment, and the host never
 * learns the guest tried.
 *
 * The Server Action is stubbed because it is server code — it reaches Supabase, hashes
 * an idempotency key and consumes a rate limit. What is under test here is what the
 * component does with the state the action returns, which is exactly the seam the stub
 * sits on.
 */

const actionResult = { current: { status: 'idle', message: '', fieldErrors: {} } as RsvpFormState };

vi.mock('@/app/actions/submitRsvp', () => ({
  submitRsvpAction: (_state: RsvpFormState, _formData: FormData) =>
    Promise.resolve(actionResult.current),
}));

const { RsvpForm } = await import('@/features/rsvp/RsvpForm');

function renderForm() {
  return render(<RsvpForm eventId="event-1" sideALabel="צד החתן" sideBLabel="צד הכלה" />);
}

const submit = () => screen.getByRole('button', { name: 'שליחת אישור הגעה' });

beforeEach(() => {
  actionResult.current = { status: 'idle', message: '', fieldErrors: {} };
});

describe('RsvpForm', () => {
  it('shows the two family sides the event was configured with', () => {
    renderForm();

    expect(screen.getByRole('option', { name: 'צד החתן' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'צד הכלה' })).toBeInTheDocument();
  });

  it('starts on "we will be there", with the head counts showing', () => {
    renderForm();

    expect(screen.getByRole('radio', { name: 'נגיע בשמחה' })).toBeChecked();
    expect(screen.getByLabelText('מבוגרים')).toHaveValue(1);
  });

  /** Counts are meaningless once a guest has declined, and asking for them is noise. */
  it('hides the head counts once a guest says they cannot come', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('radio', { name: 'לא נוכל להגיע' }));

    expect(screen.queryByLabelText('מבוגרים')).not.toBeInTheDocument();
  });

  describe('after a rejected submission', () => {
    it('redraws every field with what the guest typed', async () => {
      const user = userEvent.setup();
      actionResult.current = {
        status: 'error',
        message: '',
        fieldErrors: { phone: 'מספר הטלפון אינו תקין' },
        values: {
          fullName: 'ישראל ישראלי',
          phone: '05012',
          attendanceStatus: 'attending',
          adultsCount: '3',
          childrenCount: '2',
          babiesCount: '1',
          familySide: 'side_b',
          dietaryRequirements: 'ללא גלוטן',
          notes: 'נגיע קצת מאוחר',
        },
      };
      renderForm();

      await user.click(submit());

      await waitFor(() => {
        expect(screen.getByLabelText(/שם מלא/)).toHaveValue('ישראל ישראלי');
      });
      expect(screen.getByLabelText(/טלפון/)).toHaveValue('05012');
      expect(screen.getByLabelText('מבוגרים')).toHaveValue(3);
      expect(screen.getByLabelText('ילדים')).toHaveValue(2);
      expect(screen.getByLabelText('תינוקות')).toHaveValue(1);
      expect(screen.getByLabelText('צד משפחה')).toHaveValue('side_b');
      expect(screen.getByLabelText('דרישות תזונה')).toHaveValue('ללא גלוטן');
      expect(screen.getByLabelText('הערות')).toHaveValue('נגיע קצת מאוחר');
    });

    /**
     * The subtler half of the same bug. React resets the radio to its default, so the
     * component's mirrored `status` said `not_attending` while the DOM said `attending`
     * — leaving the head counts hidden under a selection that no longer existed, with
     * no way to get them back short of reloading and starting over.
     */
    it('keeps the counts hidden when the rejected answer was a decline', async () => {
      const user = userEvent.setup();
      actionResult.current = {
        status: 'error',
        message: '',
        fieldErrors: { fullName: 'נא למלא שם מלא' },
        values: {
          fullName: '',
          phone: '0501234567',
          attendanceStatus: 'not_attending',
          adultsCount: '0',
          childrenCount: '0',
          babiesCount: '0',
          familySide: '',
          dietaryRequirements: '',
          notes: '',
        },
      };
      renderForm();

      await user.click(submit());

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: 'לא נוכל להגיע' })).toBeChecked();
      });
      expect(screen.queryByLabelText('מבוגרים')).not.toBeInTheDocument();
    });

    it('reopens the counts when the rejected answer was an acceptance', async () => {
      const user = userEvent.setup();
      actionResult.current = {
        status: 'error',
        message: '',
        fieldErrors: { phone: 'מספר הטלפון אינו תקין' },
        values: {
          fullName: 'רות לוי',
          phone: 'x',
          attendanceStatus: 'maybe',
          adultsCount: '2',
          childrenCount: '0',
          babiesCount: '0',
          familySide: '',
          dietaryRequirements: '',
          notes: '',
        },
      };
      renderForm();

      await user.click(screen.getByRole('radio', { name: 'לא נוכל להגיע' }));
      expect(screen.queryByLabelText('מבוגרים')).not.toBeInTheDocument();

      await user.click(submit());

      await waitFor(() => {
        expect(screen.getByLabelText('מבוגרים')).toHaveValue(2);
      });
    });

    /** §9: an error has to be bound to its field, not left as loose red text nearby. */
    it('binds the message to the field it is about', async () => {
      const user = userEvent.setup();
      actionResult.current = {
        status: 'error',
        message: '',
        fieldErrors: { phone: 'מספר הטלפון אינו תקין' },
      };
      renderForm();

      await user.click(submit());

      await waitFor(() => {
        expect(screen.getByLabelText(/טלפון/)).toHaveAttribute('aria-invalid', 'true');
      });
      expect(screen.getByLabelText(/טלפון/)).toHaveAccessibleDescription(/מספר הטלפון אינו תקין/);
    });

    it('shows a form-level failure as an alert', async () => {
      const user = userEvent.setup();
      actionResult.current = {
        status: 'error',
        message: 'נשלחו יותר מדי בקשות. נסו שוב בעוד מספר דקות.',
        fieldErrors: {},
      };
      renderForm();

      await user.click(submit());

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('נשלחו יותר מדי בקשות');
      });
    });
  });

  it('replaces the form with a confirmation once the answer is in', async () => {
    const user = userEvent.setup();
    actionResult.current = {
      status: 'success',
      message: 'אישור ההגעה שלכם נקלט. מחכים לראותכם!',
      fieldErrors: {},
    };
    renderForm();

    await user.click(submit());

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'תודה רבה!' })).toBeInTheDocument();
    });
    expect(screen.getByText('אישור ההגעה שלכם נקלט. מחכים לראותכם!')).toBeInTheDocument();
    expect(screen.queryByLabelText(/שם מלא/)).not.toBeInTheDocument();
  });

  /**
   * §6.1. The honeypot has to stay reachable to a bot filling every input and
   * unreachable to a guest — hidden with `display:none` it is skipped by the bots it
   * exists to catch, and left in the tab order it traps a keyboard user in a field
   * labelled "do not fill this in".
   */
  it('keeps the honeypot out of the tab order', () => {
    renderForm();

    const honeypot = screen.getByLabelText('אל תמלאו שדה זה');
    expect(honeypot).toHaveAttribute('tabindex', '-1');
    expect(honeypot).toHaveAttribute('autocomplete', 'off');
  });
});

/**
 * The success state, which used to be a dead end.
 *
 * A guest who has just promised to come is the one person on the page most likely to
 * want the date in their calendar, and the entry sits at the top of the invitation —
 * above a form they have already scrolled past and submitted. These specs hold the
 * second offer in place.
 */
describe('the confirmation', () => {
  const calendar = {
    uid: 'demo1234',
    title: 'ברית מילה — יונתן',
    date: '2026-07-29',
    time: '19:00:00',
    venueName: 'אולמי הדר',
    address: 'רחוב הרצל 1, נתניה',
  } as const;

  it('offers the calendar entry once the answer is in', async () => {
    const user = userEvent.setup();
    actionResult.current = { status: 'success', message: 'תודה!', fieldErrors: {} };
    render(
      <RsvpForm eventId="event-1" sideALabel="צד החתן" sideBLabel="צד הכלה" calendar={calendar} />,
    );

    // Reached by submitting rather than by initial state: `useActionState` starts at
    // `INITIAL_STATE` and only takes the stubbed result once an action has run.
    await user.click(submit());

    await waitFor(() => {
      expect(screen.getByText('תודה!')).toBeInTheDocument();
    });
    expect(screen.getByText(/יומן/)).toBeInTheDocument();
  });

  it('does not offer it before the guest has answered', () => {
    render(
      <RsvpForm eventId="event-1" sideALabel="צד החתן" sideBLabel="צד הכלה" calendar={calendar} />,
    );

    expect(screen.queryByText(/יומן/)).not.toBeInTheDocument();
  });

  it('still renders the confirmation when no calendar details were passed', async () => {
    const user = userEvent.setup();
    actionResult.current = { status: 'success', message: 'תודה!', fieldErrors: {} };
    renderForm();

    await user.click(submit());

    await waitFor(() => {
      expect(screen.getByText('תודה!')).toBeInTheDocument();
    });
    expect(screen.queryByText(/יומן/)).not.toBeInTheDocument();
  });
});
