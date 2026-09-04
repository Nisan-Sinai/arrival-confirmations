import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AuthFormState } from '@/app/actions/auth';
import { AuthForm } from '@/features/auth/AuthForm';
import { AuthFragmentNotice } from '@/features/auth/AuthFragmentNotice';
import { NotFoundContent } from '@/features/layout/NotFoundContent';
import { PricingCards } from '@/features/pricing/PricingCards';

describe('the English public experience', () => {
  it('keeps an expired-link recovery action on the English route', async () => {
    window.history.replaceState(null, '', '/en#error=access_denied&error_code=otp_expired');
    render(<AuthFragmentNotice locale="en" />);

    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });

    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute(
      'href',
      '/en/forgot-password',
    );
  });

  it('announces required authentication fields in English', () => {
    const action = vi.fn(async (): Promise<AuthFormState> => ({ status: 'idle', message: '' }));
    render(<AuthForm action={action} mode="signUp" locale="en" />);

    expect(screen.getByRole('textbox', { name: 'Email address (Required)' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Password.*Required/)).toBeInTheDocument();
    expect(screen.queryByText('שדה חובה')).not.toBeInTheDocument();
  });

  it('renders a fully English 404 with English destinations', () => {
    render(<NotFoundContent locale="en" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute(
      'href',
      '/en',
    );
    expect(screen.getByRole('link', { name: 'Sign in to your account' })).toHaveAttribute(
      'href',
      '/en/login',
    );
  });

  it('announces that paid-plan links open a new window', () => {
    render(<PricingCards locale="en" showTrial={false} />);

    expect(
      screen.getByRole('link', { name: 'Choose Basic (Opens in a new window)' }),
    ).toHaveAttribute('target', '_blank');
  });
});
