import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/actions/adminGuestImports', () => ({
  adminImportPhoneContactsAction: vi.fn(),
}));

vi.mock('@/app/actions/manageAdminCustomerEvent', () => ({
  adminDeleteGuestAction: vi.fn(),
  adminSaveGuestAction: vi.fn(),
}));

vi.mock('@/app/actions/manageGuests', () => ({
  deleteGuestAction: vi.fn(),
  importGuestFileAction: vi.fn(),
  importPhoneContactsAction: vi.fn(),
  saveGuestAction: vi.fn(),
  toggleGuestCheckInAction: vi.fn(),
}));

const { GuestManagementPanel } = await import('@/features/admin/GuestManagementPanel');

const guests = [
  {
    id: 'g1',
    fullName: 'ישראל ישראלי',
    phone: '050-1234567',
    email: 'israel@example.com',
    partySize: 3,
    tableName: 'משפחה',
    seatNumber: '1',
    notes: null,
    checkedInAt: null,
  },
  {
    id: 'g2',
    fullName: 'שרה כהן',
    phone: '052-7654321',
    email: null,
    partySize: 2,
    tableName: 'VIP',
    seatNumber: null,
    notes: null,
    checkedInAt: '2026-07-29T17:05:00.000Z',
  },
] as const;

describe('GuestManagementPanel', () => {
  it('shows the main workflows and a useful list summary', () => {
    render(<GuestManagementPanel mode="owner" eventId="e1" guests={guests} />);

    expect(
      screen.getByRole('navigation', { name: 'פעולות מהירות לניהול המוזמנים' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'הוספה ידנית' })).toHaveAttribute(
      'href',
      '#manual-add',
    );
    expect(screen.getByRole('link', { name: 'אנשי קשר מהטלפון' })).toHaveAttribute(
      'href',
      '#phone-import',
    );
    expect(screen.getByText('2 רשומות')).toBeInTheDocument();
    expect(screen.getByText('5 אנשים')).toBeInTheDocument();
    expect(screen.getByText('2 שובצו')).toBeInTheDocument();
  });

  it('filters the guest list by name, phone, email or table', async () => {
    const user = userEvent.setup();
    render(<GuestManagementPanel mode="owner" eventId="e1" guests={guests} />);

    await user.type(screen.getByLabelText('חיפוש ברשימה'), 'VIP');

    expect(screen.getByText('שרה כהן')).toBeInTheDocument();
    expect(screen.queryByText('ישראל ישראלי')).not.toBeInTheDocument();
  });

  it('offers a one-click way to clear a search with no results', async () => {
    const user = userEvent.setup();
    render(<GuestManagementPanel mode="owner" eventId="e1" guests={guests} />);

    await user.type(screen.getByLabelText('חיפוש ברשימה'), 'לא קיים');
    expect(screen.getByText('לא נמצאו מוזמנים מתאימים')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ניקוי החיפוש' }));
    expect(screen.getByText('ישראל ישראלי')).toBeInTheDocument();
    expect(screen.getByText('שרה כהן')).toBeInTheDocument();
  });

  it('explains the fallback before the user tries an unsupported contact picker', async () => {
    render(<GuestManagementPanel mode="owner" eventId="e1" guests={guests} />);

    expect(await screen.findByText(/הבחירה הישירה אינה זמינה בדפדפן הזה/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'בחירת אנשי קשר מהטלפון' })).toBeDisabled();
    expect(screen.getByLabelText('הדבקת רשימה')).toBeInTheDocument();
  });

  it('turns an empty list into clear next actions', () => {
    render(<GuestManagementPanel mode="owner" eventId="e1" guests={[]} />);

    expect(screen.getByText('עדיין אין מוזמנים ברשימה')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'הוספת מוזמן' })).toHaveAttribute(
      'href',
      '#manual-add',
    );
    expect(screen.getByRole('link', { name: 'ייבוא מהטלפון' })).toHaveAttribute(
      'href',
      '#phone-import',
    );
  });
});

/**
 * Arrival check-in.
 *
 * An RSVP is a promise made weeks ahead; on the night the host needs the other number.
 * The control lives in the row header rather than behind the edit panel because it is
 * used standing at a door with a queue behind them.
 */
describe('arrival check-in', () => {
  it('offers the mark to a guest who has not arrived, and reads back the one who has', () => {
    render(<GuestManagementPanel mode="owner" eventId="event-1" guests={guests} />);

    expect(screen.getByRole('button', { name: /סימון הגעה/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^הגיע$/ })).toBeInTheDocument();
  });

  it('announces the arrived state to assistive technology', () => {
    render(<GuestManagementPanel mode="owner" eventId="event-1" guests={guests} />);

    expect(screen.getByRole('button', { name: /סימון הגעה/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /^הגיע$/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('sends the state it is leaving, so a double tap settles on one answer', () => {
    render(<GuestManagementPanel mode="owner" eventId="event-1" guests={guests} />);

    const unmarked = screen.getByRole('button', { name: /סימון הגעה/ }).closest('form');
    const marked = screen.getByRole('button', { name: /^הגיע$/ }).closest('form');

    expect(unmarked?.querySelector('input[name="checkedIn"]')).toHaveValue('true');
    expect(marked?.querySelector('input[name="checkedIn"]')).toHaveValue('false');
  });

  it('is absent for a platform admin, who is not the one at the door', () => {
    render(<GuestManagementPanel mode="admin" eventId="event-1" guests={guests} />);

    expect(screen.queryByRole('button', { name: /סימון הגעה/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^הגיע$/ })).not.toBeInTheDocument();
  });
});
