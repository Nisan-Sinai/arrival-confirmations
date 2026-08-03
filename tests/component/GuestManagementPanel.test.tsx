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
  },
] as const;

describe('GuestManagementPanel', () => {
  it('shows the main workflows and a useful list summary', () => {
    render(<GuestManagementPanel mode="owner" eventId="e1" guests={guests} />);

    expect(screen.getByRole('navigation', { name: 'פעולות מהירות לניהול המוזמנים' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'הוספה ידנית' })).toHaveAttribute('href', '#manual-add');
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

    expect(
      await screen.findByText(/הבחירה הישירה אינה זמינה בדפדפן הזה/),
    ).toBeInTheDocument();
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
