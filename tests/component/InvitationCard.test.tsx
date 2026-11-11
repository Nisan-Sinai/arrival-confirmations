import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PublicEvent } from '@/repositories/eventRepository';

/**
 * The invitation a guest opens.
 *
 * Two defects reached real guests through this component, and both are pinned here.
 *
 * The first was the clock. The countdown target was built by handing a wall-clock string
 * to `TZDate`, which parses it in the *server's* zone; the servers are in UTC, so a 19:30
 * chuppah counted down to 19:30 UTC — two hours after the ceremony in winter, three in
 * summer. The target is asserted as an absolute instant, so the test cannot pass on a
 * machine that happens to share Israel's offset.
 *
 * The second was the artwork: a teddy bear and baby shoes on every invitation, weddings
 * included.
 */

vi.mock('@/features/invite/Countdown', () => ({
  Countdown: ({ targetMs }: { targetMs: number }) => (
    <output data-testid="target">{targetMs}</output>
  ),
}));

vi.mock('@/features/invite/Ornaments', () => {
  const ornament = (name: string) => {
    const Ornament = () => <i data-ornament={name} />;
    Ornament.displayName = name;
    return Ornament;
  };
  return {
    WatercolourWash: ornament('WatercolourWash'),
    CornerFiligree: ornament('CornerFiligree'),
    Bunting: ornament('Bunting'),
    Balloons: ornament('Balloons'),
    TeddyBear: ornament('TeddyBear'),
    GiftAndShoes: ornament('GiftAndShoes'),
    GiftBox: ornament('GiftBox'),
    Confetti: ornament('Confetti'),
    Rings: ornament('Rings'),
    FloralSprig: ornament('FloralSprig'),
  };
});

const { InvitationCard } = await import('@/features/invite/InvitationCard');

function event(overrides: Partial<PublicEvent> = {}): PublicEvent {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    public_id: 'public-id',
    event_type: 'wedding',
    title: 'החתונה',
    hosts_names: 'משפחת כהן ומשפחת לוי',
    honoree_display_name: 'נועה ואיתי',
    event_date: '2026-12-15',
    ceremony_time: '19:30:00',
    reception_time: '18:30:00',
    venue_name: 'אולמי הדר',
    address: 'דרך השלום 12, תל אביב',
    waze_url: null,
    google_maps_url: null,
    gift_url: null,
    contact_phone: null,
    description: null,
    side_a_label: null,
    side_b_label: null,
    ...overrides,
  };
}

const ornaments = (container: HTMLElement): string[] =>
  [...container.querySelectorAll('[data-ornament]')]
    .map((node) => node.getAttribute('data-ornament')!)
    .filter((name) => name !== 'WatercolourWash' && name !== 'CornerFiligree');

describe('InvitationCard countdown target', () => {
  it('counts down to the ceremony in Israel time on a winter date', () => {
    render(<InvitationCard event={event()} />);
    // 19:30 at +02:00.
    expect(Number(screen.getByTestId('target').textContent)).toBe(Date.UTC(2026, 11, 15, 17, 30));
  });

  it('counts down to the ceremony in Israel time on a summer date', () => {
    render(<InvitationCard event={event({ event_date: '2026-08-15' })} />);
    // 19:30 at +03:00.
    expect(Number(screen.getByTestId('target').textContent)).toBe(Date.UTC(2026, 7, 15, 16, 30));
  });

  it('falls back to midday when the host left the ceremony time blank', () => {
    render(<InvitationCard event={event({ ceremony_time: null })} />);
    expect(Number(screen.getByTestId('target').textContent)).toBe(Date.UTC(2026, 11, 15, 10, 0));
  });
});

describe('InvitationCard artwork', () => {
  it('keeps the original nursery scene on a brit', () => {
    const { container } = render(<InvitationCard event={event({ event_type: 'brit_mila' })} />);
    expect(ornaments(container)).toEqual([
      'Bunting',
      'Balloons',
      'TeddyBear',
      'GiftAndShoes',
      'FloralSprig',
    ]);
  });

  it('puts rings and sprigs, and nothing from the nursery, on a wedding', () => {
    const { container } = render(<InvitationCard event={event({ event_type: 'wedding' })} />);
    expect(ornaments(container)).toEqual(['Rings', 'FloralSprig', 'FloralSprig']);
  });

  it('gives a bat mitzvah a party without a bear or baby shoes', () => {
    const { container } = render(<InvitationCard event={event({ event_type: 'bat_mitzvah' })} />);
    const drawn = ornaments(container);
    expect(drawn).toEqual(['Bunting', 'Balloons', 'Confetti', 'GiftBox']);
    expect(drawn).not.toContain('TeddyBear');
    expect(drawn).not.toContain('GiftAndShoes');
  });

  it('leaves a henna with the sprigs alone', () => {
    const { container } = render(<InvitationCard event={event({ event_type: 'henna' })} />);
    expect(ornaments(container)).toEqual(['FloralSprig', 'FloralSprig']);
  });

  it('draws the four corners on every kind of event', () => {
    for (const type of ['brit_mila', 'wedding', 'birthday', 'other'] as const) {
      const { container, unmount } = render(<InvitationCard event={event({ event_type: type })} />);
      expect(container.querySelectorAll('[data-ornament="CornerFiligree"]')).toHaveLength(4);
      unmount();
    }
  });
});

describe('InvitationCard content', () => {
  it('names the occasion, the honoree and the hosts', () => {
    render(<InvitationCard event={event()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'חתונה' })).toBeInTheDocument();
    expect(screen.getByText('נועה ואיתי')).toBeInTheDocument();
    expect(screen.getByText('משפחת כהן ומשפחת לוי')).toBeInTheDocument();
    // 15 December 2026 is a Tuesday; the weekday shares its medallion with the date.
    expect(screen.getByText(/ביום שלישי/)).toBeInTheDocument();
  });
});
