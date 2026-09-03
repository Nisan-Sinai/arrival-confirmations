import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { WhatsAppSendCenter, type SendCenterGuest } from '@/features/admin/WhatsAppSendCenter';

function guest(overrides: Partial<SendCenterGuest> = {}): SendCenterGuest {
  return {
    id: 'g1',
    fullName: 'דוד כהן',
    phone: '050-1234567',
    attendanceStatus: null,
    inviteLinkIssuedAt: null,
    inviteFirstOpenedAt: null,
    inviteLastOpenedAt: null,
    inviteOpenCount: 0,
    inviteLastResponseAt: null,
    inviteLastResponseStatus: null,
    ...overrides,
  };
}

function sendLink() {
  return screen.getByRole('link', { name: /שליחת לינק אישי|שליחה מחדש/ });
}

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    // jsdom always provides storage; the guard mirrors the component's own.
  }
});

describe('WhatsAppSendCenter', () => {
  it('sends the plain personal link one-by-one on the free plan, with no controls', () => {
    render(
      <WhatsAppSendCenter eventId="e1" eventTitle="הברית" guests={[guest()]} premium={false} />,
    );

    // The free plan never routes through a template — the route keeps its own wording.
    expect(sendLink()).toHaveAttribute('href', '/share/guest/g1');
    // No message-type / audience controls on the free plan; the bulk workflow is the upsell.
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('link', { name: 'שדרוג ל-Premium' })).toBeInTheDocument();
  });

  it('routes an invitation through the personal-link issuer on Premium', () => {
    render(<WhatsAppSendCenter eventId="e1" eventTitle="הברית" guests={[guest()]} premium />);

    expect(sendLink()).toHaveAttribute('href', '/share/guest/g1?kind=invitation');
    // Premium reveals the controls.
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
  });

  it('sends a thank-you straight to WhatsApp with no token', async () => {
    render(
      <WhatsAppSendCenter
        eventId="e1"
        eventTitle="הברית"
        guests={[guest({ attendanceStatus: 'attending' })]}
        premium
      />,
    );

    const [kindSelect] = screen.getAllByRole('combobox');
    if (kindSelect === undefined) throw new Error('the message-kind select is missing');
    await userEvent.selectOptions(kindSelect, 'thanks');

    const href = sendLink().getAttribute('href') ?? '';
    expect(href).toContain('https://api.whatsapp.com/send');
    expect(href).not.toContain('/share/guest/');
  });

  it('shows each guest their tracking status on both plans', () => {
    render(
      <WhatsAppSendCenter
        eventId="e1"
        eventTitle="הברית"
        guests={[guest({ inviteLinkIssuedAt: '2026-09-03T09:05:00.000Z' })]}
        premium={false}
      />,
    );

    const row = screen.getByRole('listitem');
    expect(within(row).getByText('קישור נוצר — טרם נפתח')).toBeInTheDocument();
  });

  it('refuses an unreachable number rather than building a broken send', () => {
    render(
      <WhatsAppSendCenter
        eventId="e1"
        eventTitle="הברית"
        guests={[guest({ phone: '123' })]}
        premium
      />,
    );

    expect(screen.queryByRole('link', { name: /שליחת לינק אישי|שליחה מחדש/ })).toBeNull();
    expect(screen.getByText('מספר הטלפון אינו תקין')).toBeInTheDocument();
  });
});
