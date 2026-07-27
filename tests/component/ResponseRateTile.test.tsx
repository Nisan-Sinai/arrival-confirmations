import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExpectedGuestsState } from '@/app/actions/manageEvent';

/**
 * The response-rate tile (§8.1).
 *
 * The rule this file exists to hold: a percentage needs a denominator, and the product
 * does not have one unless the host supplies it. "142 replies out of 142 invitations"
 * is not a response rate, it is a count wearing a percent sign — and a host reading
 * 100% concludes everyone has answered and stops chasing anyone.
 */

const actionResult = { current: { status: 'idle', message: '' } as ExpectedGuestsState };

vi.mock('@/app/actions/manageEvent', () => ({
  updateExpectedGuestsAction: (_state: ExpectedGuestsState, _formData: FormData) =>
    Promise.resolve(actionResult.current),
}));

const { ResponseRateTile } = await import('@/features/admin/ResponseRateTile');

beforeEach(() => {
  actionResult.current = { status: 'idle', message: '' };
});

describe('ResponseRateTile', () => {
  it('refuses to show a percentage the host never gave it a denominator for', () => {
    render(<ResponseRateTile eventId="e1" percentage={null} invited={0} expectedGuests={null} />);

    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'הזינו כמה הזמנות שלחתם' })).toBeInTheDocument();
  });

  it('shows the rate and the denominator it was computed from', () => {
    render(<ResponseRateTile eventId="e1" percentage={62} invited={120} expectedGuests={120} />);

    expect(screen.getByText('62%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /מתוך 120 הזמנות/ })).toBeInTheDocument();
  });

  /** The whole point of editing in place: the host knows the number while reading replies. */
  it('opens the editor seeded with the current denominator', async () => {
    const user = userEvent.setup();
    render(<ResponseRateTile eventId="e1" percentage={62} invited={120} expectedGuests={120} />);

    await user.click(screen.getByRole('button', { name: /מתוך 120 הזמנות/ }));

    expect(screen.getByLabelText('כמה הזמנות שלחתם?')).toHaveValue(120);
  });

  it('leaves the field empty when there is nothing to seed it with', async () => {
    const user = userEvent.setup();
    render(<ResponseRateTile eventId="e1" percentage={null} invited={0} expectedGuests={null} />);

    await user.click(screen.getByRole('button', { name: 'הזינו כמה הזמנות שלחתם' }));

    expect(screen.getByLabelText('כמה הזמנות שלחתם?')).toHaveValue(null);
  });

  it('closes the editor without saving when the host cancels', async () => {
    const user = userEvent.setup();
    render(<ResponseRateTile eventId="e1" percentage={62} invited={120} expectedGuests={120} />);

    await user.click(screen.getByRole('button', { name: /מתוך 120 הזמנות/ }));
    await user.click(screen.getByRole('button', { name: 'ביטול' }));

    expect(screen.getByText('62%')).toBeInTheDocument();
  });

  it('closes the editor once the save comes back', async () => {
    const user = userEvent.setup();
    actionResult.current = { status: 'saved', message: 'השינויים נשמרו.' };
    render(<ResponseRateTile eventId="e1" percentage={62} invited={120} expectedGuests={120} />);

    await user.click(screen.getByRole('button', { name: /מתוך 120 הזמנות/ }));
    await user.click(screen.getByRole('button', { name: 'שמירה' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('כמה הזמנות שלחתם?')).not.toBeInTheDocument();
    });
    // §9: announced once, after the form has closed and the button is back.
    expect(screen.getByRole('status')).toHaveTextContent('השינויים נשמרו.');
  });

  it('keeps the editor open and binds the error to the field when the save is rejected', async () => {
    const user = userEvent.setup();
    actionResult.current = { status: 'error', message: 'יש להזין מספר בין 1 ל-5000.' };
    render(<ResponseRateTile eventId="e1" percentage={null} invited={0} expectedGuests={null} />);

    await user.click(screen.getByRole('button', { name: 'הזינו כמה הזמנות שלחתם' }));
    await user.click(screen.getByRole('button', { name: 'שמירה' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('יש להזין מספר בין 1 ל-5000.');
    });
    const field = screen.getByLabelText('כמה הזמנות שלחתם?');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription(/יש להזין מספר בין 1 ל-5000./);
  });
});
