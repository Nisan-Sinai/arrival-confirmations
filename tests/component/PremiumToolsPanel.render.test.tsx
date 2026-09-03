import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/actions/managePremiumTools', () => ({
  importGuestsAction: vi.fn(),
  saveBrandingAction: vi.fn(),
  saveSeatingAction: vi.fn(),
}));
vi.mock('@/app/actions/manageProSeating', () => ({
  saveProTablesAction: vi.fn(),
  saveProGuestSeatingAction: vi.fn(),
  autoSeatGuestsAction: vi.fn(),
  clearUnlockedSeatingAction: vi.fn(),
  saveSeatingSnapshotAction: vi.fn(),
}));

const { PremiumToolsPanel } = await import('@/features/admin/PremiumToolsPanel');

const branding = {
  primaryColor: '#5B3A29',
  accentColor: '#B58B4A',
  logoUrl: null,
  invitationStyle: 'classic',
};

const guest = {
  id: 'g1',
  fullName: 'דוד כהן',
  phone: '050-1234567',
  partySize: 2,
  tableId: null,
  tableName: null,
  seatNumber: null,
  seatingGroup: null,
  familySide: null,
  mealPreference: null,
  accessibilityNeeds: null,
  priority: 0,
  seatLocked: false,
  attendanceStatus: null,
};

describe('PremiumToolsPanel renders on the guest page', () => {
  it('renders the Pro suite without throwing', () => {
    expect(() =>
      render(
        <PremiumToolsPanel
          eventId="e1"
          eventTitle="הברית"
          guests={[guest]}
          branding={branding}
          isPro
          attendeeLimit={2500}
          seatingTables={[]}
          snapshotCount={0}
        />,
      ),
    ).not.toThrow();
  });

  it('renders the locked preview without throwing', () => {
    expect(() =>
      render(
        <PremiumToolsPanel
          eventId="e1"
          eventTitle="הברית"
          guests={[guest]}
          branding={branding}
          isPro={false}
          attendeeLimit={1000}
          seatingTables={[]}
          snapshotCount={0}
          locked
        />,
      ),
    ).not.toThrow();
  });
});
