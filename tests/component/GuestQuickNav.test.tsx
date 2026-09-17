import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GuestQuickNav } from '@/features/admin/GuestQuickNav';

describe('GuestQuickNav', () => {
  it('links to every management section, with the WhatsApp send only for the owner', () => {
    render(<GuestQuickNav mode="owner" guestCount={809} />);

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
    expect(screen.getByRole('link', { name: 'שליחה ב-WhatsApp' })).toHaveAttribute(
      'href',
      '#whatsapp-send-center',
    );
    // The count rides in the list link so it stays visible while scrolling.
    expect(screen.getByRole('link', { name: 'הרשימה (809)' })).toHaveAttribute(
      'href',
      '#guest-list',
    );
  });

  it('hides the owner-only sends in admin mode', () => {
    render(<GuestQuickNav mode="admin" guestCount={3} />);

    expect(screen.getByRole('link', { name: 'הוספה ידנית' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'שליחה ב-WhatsApp' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'ייבוא קובץ' })).not.toBeInTheDocument();
  });
});
