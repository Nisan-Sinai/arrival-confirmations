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
    // Keep the hand-off in the current tab. Opening the issuing route in a new tab leaves
    // an about:blank tab behind on iOS and in WhatsApp's embedded browser.
    expect(sendLink()).not.toHaveAttribute('target');
    // No message-type / audience controls on the free plan; the bulk workflow is the upsell.
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('link', { name: 'שדרוג ל-Premium' })).toBeInTheDocument();
  });

  it('routes an invitation through the personal-link issuer on Premium', () => {
    render(<WhatsAppSendCenter eventId="e1" eventTitle="הברית" guests={[guest()]} premium />);

    expect(sendLink()).toHaveAttribute('href', '/share/guest/g1?kind=invitation');
    // Premium reveals the controls.
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'התחלת שליחה לכולם (1)' })).toBeInTheDocument();
  });

  it('builds the bulk-send queue from the currently filtered unsent guests', async () => {
    window.localStorage.setItem('whatsapp-send-progress:e1:invitation', JSON.stringify(['g1']));
    render(
      <WhatsAppSendCenter
        eventId="e1"
        eventTitle="הברית"
        guests={[guest(), guest({ id: 'g2', fullName: 'שרה כהן', phone: '050-7654321' })]}
        premium
      />,
    );

    const selects = screen.getAllByRole('combobox');
    const scopeSelect = selects[1];
    if (scopeSelect === undefined) throw new Error('the audience select is missing');
    await userEvent.selectOptions(scopeSelect, 'not_sent');

    expect(screen.getByRole('button', { name: 'התחלת שליחה לכולם (1)' })).toBeInTheDocument();
    expect(screen.getByText('שרה כהן')).toBeInTheDocument();
    expect(screen.queryByText('דוד כהן')).toBeNull();
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
