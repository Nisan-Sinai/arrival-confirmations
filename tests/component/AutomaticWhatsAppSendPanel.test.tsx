import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AutomaticWhatsAppSendPanel } from '@/features/admin/AutomaticWhatsAppSendPanel';

const guests = [
  { id: 'g1', fullName: 'דוד כהן', phone: '050-1234567', attendanceStatus: null },
  { id: 'g2', fullName: 'שרה כהן', phone: '052-1234567', attendanceStatus: null },
] as const;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AutomaticWhatsAppSendPanel', () => {
  it('requires a second explicit click before a bulk send', async () => {
    render(<AutomaticWhatsAppSendPanel eventId="e1" eventTitle="החתונה" guests={guests} enabled />);

    await userEvent.click(screen.getByRole('button', { name: 'שליחה אוטומטית לכולם (2)' }));
    expect(screen.getByText('אישור לפני שליחה המונית')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'אישור ושליחה עכשיו' })).toBeInTheDocument();
  });

  it('reuses the same campaign id after an interrupted batch to prevent duplicate sends', async () => {
    const manyGuests = Array.from({ length: 21 }, (_, index) => ({
      id: `g${index + 1}`,
      fullName: `אורח ${index + 1}`,
      phone: `050123${String(index).padStart(4, '0')}`,
      attendanceStatus: null,
    }));
    const randomUUID = vi.fn(() => '22222222-2222-4222-8222-222222222222');
    vi.stubGlobal('crypto', { randomUUID });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          sent: 20,
          failed: 0,
          alreadySent: 0,
          invalid: 0,
          results: manyGuests.slice(0, 20).map((guest) => ({ guestId: guest.id, status: 'sent' })),
        }),
      )
      .mockResolvedValueOnce(Response.json({ error: 'batch_failed' }, { status: 500 }))
      .mockResolvedValueOnce(
        Response.json({
          sent: 0,
          failed: 0,
          alreadySent: 20,
          invalid: 0,
          results: manyGuests
            .slice(0, 20)
            .map((guest) => ({ guestId: guest.id, status: 'already_sent' })),
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          sent: 1,
          failed: 0,
          alreadySent: 0,
          invalid: 0,
          results: [{ guestId: manyGuests[20]!.id, status: 'sent' }],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AutomaticWhatsAppSendPanel eventId="e1" eventTitle="החתונה" guests={manyGuests} enabled />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'שליחה אוטומטית לכולם (21)' }));
    await userEvent.click(screen.getByRole('button', { name: 'אישור ושליחה עכשיו' }));
    expect(await screen.findByText(/השליחה נעצרה באמצע/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'שליחה אוטומטית לכולם (21)' }));
    await userEvent.click(screen.getByRole('button', { name: 'אישור ושליחה עכשיו' }));
    expect(await screen.findByText(/נשלחו 1 הודעות/)).toBeInTheDocument();

    expect(randomUUID).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const [, options] of fetchMock.mock.calls) {
      expect(JSON.parse(String(options?.body)).campaignId).toBe(
        '22222222-2222-4222-8222-222222222222',
      );
    }
  });

  it('sends the whole filtered group to the server without opening WhatsApp', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-1111-4111-8111-111111111111' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          sent: 2,
          failed: 0,
          alreadySent: 0,
          invalid: 0,
          results: [
            { guestId: 'g1', status: 'sent' },
            { guestId: 'g2', status: 'sent' },
          ],
        }),
      ),
    );

    render(<AutomaticWhatsAppSendPanel eventId="e1" eventTitle="החתונה" guests={guests} enabled />);

    await userEvent.click(screen.getByRole('button', { name: 'שליחה אוטומטית לכולם (2)' }));
    await userEvent.click(screen.getByRole('button', { name: 'אישור ושליחה עכשיו' }));

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe('/api/events/e1/whatsapp/send');
    expect(JSON.parse(String(options?.body))).toMatchObject({
      campaignId: '11111111-1111-4111-8111-111111111111',
      guestIds: ['g1', 'g2'],
      kind: 'invitation',
    });
    expect(await screen.findByText(/נשלחו 2 הודעות/)).toBeInTheDocument();
  });
});
