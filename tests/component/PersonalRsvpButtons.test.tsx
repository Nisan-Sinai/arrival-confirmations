import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/actions/submitPersonalRsvp', () => ({
  submitPersonalRsvpAction: vi.fn(async () => ({ status: 'idle', message: '' })),
}));

import { PersonalRsvpButtons } from '@/features/rsvp/PersonalRsvpButtons';

describe('PersonalRsvpButtons', () => {
  it('lets a personal invite choose how many people are attending', () => {
    render(
      <PersonalRsvpButtons
        guestName="אבי"
        partySize={1}
        currentStatus={null}
        currentAttendeeCount={null}
      />,
    );

    const countSelect = screen.getByRole('combobox', { name: 'כמות האנשים שמגיעים' });
    expect(countSelect).toHaveValue('1');
    expect(within(countSelect).getAllByRole('option')).toHaveLength(30);
    expect(within(countSelect).getByRole('option', { name: '5 אנשים' })).toHaveValue('5');
  });

  it('restores the count from an existing attending response', () => {
    render(
      <PersonalRsvpButtons
        guestName="אבי"
        partySize={1}
        currentStatus="attending"
        currentAttendeeCount={5}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'כמות האנשים שמגיעים' })).toHaveValue('5');
    const currentSelection = screen.getByText('מגיע/ה', { selector: 'strong' }).closest('p');
    expect(currentSelection).toHaveTextContent('מגיע/ה · 5 אנשים');
  });

  it('uses the host party size as the initial suggestion when available', () => {
    render(
      <PersonalRsvpButtons
        guestName="משפחת כהן"
        partySize={6}
        currentStatus={null}
        currentAttendeeCount={null}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'כמות האנשים שמגיעים' })).toHaveValue('6');
  });
});
