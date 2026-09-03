import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/events/e1',
}));

const { PersonalInviteSendList } = await import('@/features/admin/PersonalInviteSendList');
const { ShareInvitation } = await import('@/features/admin/ShareInvitation');
const { EventManagementActions } = await import('@/features/admin/EventManagementActions');

const guest = {
  id: 'g1',
  fullName: 'דוד כהן',
  phone: '050-1234567',
  inviteLinkIssuedAt: '2026-09-03T09:05:00.000Z',
  inviteFirstOpenedAt: null,
  inviteLastOpenedAt: null,
  inviteOpenCount: 0,
  inviteLastResponseAt: null,
  inviteLastResponseStatus: null,
};

/**
 * A guard for the whole "page loads but nothing works" class: a client component that
 * throws on render takes the page down to its error boundary with a 200, which no server
 * log catches. Coverage does not reach these files, so mounting them is the only check.
 */
describe('admin surfaces render without throwing', () => {
  it('renders the one-by-one send list', () => {
    expect(() => render(<PersonalInviteSendList guests={[guest]} />)).not.toThrow();
  });

  it('renders the empty send list', () => {
    expect(() => render(<PersonalInviteSendList guests={[]} />)).not.toThrow();
  });

  it('renders the share card', () => {
    expect(() =>
      render(
        <ShareInvitation
          publicId="abc123"
          origin="https://example.test"
          blessingLine="ברכה"
          invitationLine="נשמח לראותכם ב"
          honoree="ברית המילה"
        />,
      ),
    ).not.toThrow();
  });

  it('renders the event action panel', () => {
    expect(() =>
      render(
        <EventManagementActions
          eventId="e1"
          eventTitle="הברית"
          publicId="abc123"
          origin="https://example.test"
        />,
      ),
    ).not.toThrow();
  });
});
