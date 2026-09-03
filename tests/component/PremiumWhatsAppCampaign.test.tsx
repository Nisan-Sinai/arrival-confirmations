import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { PremiumWhatsAppCampaign } from '@/features/admin/PremiumWhatsAppCampaign';
import type { PremiumCampaignGuest } from '@/lib/premiumWhatsApp';

const unanswered: PremiumCampaignGuest = {
  id: 'g1',
  fullName: 'דוד כהן',
  phone: '050-1234567',
  attendanceStatus: null,
};
const attending: PremiumCampaignGuest = {
  id: 'g2',
  fullName: 'שרה לוי',
  phone: '052-7654321',
  attendanceStatus: 'attending',
};

function sendLink() {
  return screen.getByRole('link', { name: /פתיחה ושליחה/ });
}

describe('PremiumWhatsAppCampaign send routing', () => {
  it('routes an invitation through the personal-link issuer, not the public link', () => {
    render(
      <PremiumWhatsAppCampaign eventId="e1" eventTitle="הברית של יונתן" guests={[unanswered]} />,
    );

    // The whole fix: the button points at the issuer, which mints a per-guest token, so
    // the reply is attributed. A public `/e/...` link here would be the old, worse flow.
    expect(sendLink()).toHaveAttribute('href', '/share/guest/g1?kind=invitation');
  });

  it('sends a thank-you straight to WhatsApp, because it carries no link to issue', async () => {
    render(
      <PremiumWhatsAppCampaign eventId="e1" eventTitle="הברית של יונתן" guests={[attending]} />,
    );

    // Choosing "thanks" also moves the audience to those who attended, where g2 sits.
    const [kindSelect] = screen.getAllByRole('combobox');
    if (kindSelect === undefined) throw new Error('the message-kind select is missing');
    await userEvent.selectOptions(kindSelect, 'thanks');

    const href = sendLink().getAttribute('href') ?? '';
    expect(href).toContain('https://api.whatsapp.com/send');
    expect(href).not.toContain('/share/guest/');
  });

  it('refuses to build a send for an unreachable number', () => {
    render(
      <PremiumWhatsAppCampaign
        eventId="e1"
        eventTitle="הברית"
        guests={[{ ...unanswered, phone: '123' }]}
      />,
    );

    expect(screen.queryByRole('link', { name: /פתיחה ושליחה/ })).toBeNull();
    expect(screen.getByText('מספר הטלפון אינו תקין')).toBeInTheDocument();
  });
});
