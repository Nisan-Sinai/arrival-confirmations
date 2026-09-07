import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CreateCustomerPanel } from '@/features/admin/CreateCustomerPanel';

describe('CreateCustomerPanel', () => {
  it('shows the admin customer creation fields and auto-confirm explanation', () => {
    render(<CreateCustomerPanel createCustomerAction={vi.fn()} />);

    expect(screen.getByText('הוספת לקוח')).toBeInTheDocument();
    expect(screen.getByLabelText(/אימייל הלקוח/)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/סיסמה/)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/סיסמה/)).toHaveAttribute('minlength', '8');
    expect(screen.getByRole('button', { name: 'צור לקוח מאושר' })).toBeInTheDocument();
    expect(screen.getByText('לא נשלח מייל אישור.')).toBeInTheDocument();
  });

  it('shows success after an approved customer is created', () => {
    render(
      <CreateCustomerPanel
        createCustomerAction={vi.fn()}
        saved="customer-created"
      />,
    );

    expect(
      screen.getByText('הלקוח נוצר בהצלחה ומאושר כבר לכניסה. אין צורך באישור במייל.'),
    ).toBeInTheDocument();
  });

  it('shows a clear duplicate-account error', () => {
    render(
      <CreateCustomerPanel
        createCustomerAction={vi.fn()}
        error="customer-exists"
      />,
    );

    expect(screen.getByText('כבר קיים משתמש עם כתובת האימייל הזאת.')).toBeInTheDocument();
  });
});
