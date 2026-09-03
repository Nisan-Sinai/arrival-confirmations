import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SeatCard } from '@/features/invite/SeatCard';

/**
 * Where the guest is sitting.
 *
 * Most of what is asserted here is the card refusing to appear. That is the part worth
 * protecting: an empty seating card on a personal invitation reads as "you have not been
 * seated", and hosts seat people late — often the night before — so the absent state is
 * the common one, not the edge case.
 */
describe('SeatCard', () => {
  it('shows the table as the headline', () => {
    render(<SeatCard tableName="7" seatNumber={null} partySize={1} />);

    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('המקום שלך')).toBeInTheDocument();
  });

  it('carries a named table as readily as a numbered one', () => {
    // Hosts write "שולחן המשפחה" as often as they write a number, so nothing here may
    // assume the value parses.
    render(<SeatCard tableName="שולחן המשפחה" seatNumber={null} partySize={1} />);

    expect(screen.getByText('שולחן המשפחה')).toBeInTheDocument();
  });

  it('adds the seat only when there is one', () => {
    const { rerender } = render(<SeatCard tableName="7" seatNumber="4" partySize={1} />);
    expect(screen.getByText('מושב 4')).toBeInTheDocument();

    rerender(<SeatCard tableName="7" seatNumber={null} partySize={1} />);
    expect(screen.queryByText(/מושב/)).not.toBeInTheDocument();
  });

  it('speaks in the plural for an invitation covering more than one person', () => {
    render(<SeatCard tableName="7" seatNumber={null} partySize={3} />);

    expect(screen.getByText('המקומות שלכם')).toBeInTheDocument();
  });

  it('renders nothing at all until the host has seated them', () => {
    const { container } = render(<SeatCard tableName={null} seatNumber={null} partySize={1} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('treats a blank or whitespace table as unseated', () => {
    // An import can leave an empty string where a null was meant, and the difference must
    // not be the difference between a clean page and a card announcing nothing.
    for (const value of ['', '   ']) {
      const { container } = render(<SeatCard tableName={value} seatNumber="4" partySize={1} />);
      expect(container).toBeEmptyDOMElement();
    }
  });

  it('does not show a seat without a table', () => {
    const { container } = render(<SeatCard tableName={null} seatNumber="4" partySize={1} />);

    expect(container).toBeEmptyDOMElement();
  });
});
