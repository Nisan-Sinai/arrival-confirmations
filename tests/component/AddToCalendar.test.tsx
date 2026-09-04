import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AddToCalendar } from '@/features/invite/AddToCalendar';

const baseProps = {
  uid: 'event-1',
  title: 'חתונה — נועה ודניאל',
  date: '2026-09-04',
  venueName: 'אולמי הדר',
  address: 'הרצל 12, פתח תקווה',
} as const;

function calendarBody(): string {
  const href = screen.getByRole('link', { name: 'הוספה ליומן' }).getAttribute('href');
  expect(href).toBeTruthy();
  return decodeURIComponent(href!.split(',')[1]!);
}

describe('AddToCalendar', () => {
  it('rolls a late event end time into the following date', () => {
    render(<AddToCalendar {...baseProps} time="23:30:00" />);

    const body = calendarBody();
    expect(body).toContain('DTSTART;TZID=Asia/Jerusalem:20260904T233000');
    expect(body).toContain('DTEND;TZID=Asia/Jerusalem:20260905T033000');

    const google = new URL(
      screen.getByRole('link', { name: /Google Calendar/ }).getAttribute('href')!,
    );
    expect(google.searchParams.get('dates')).toBe('20260904T233000/20260905T033000');
  });

  it('creates an all-day entry instead of inventing 19:00 when no time was supplied', () => {
    render(<AddToCalendar {...baseProps} time={null} />);

    const body = calendarBody();
    expect(body).toContain('DTSTART;VALUE=DATE:20260904');
    expect(body).toContain('DTEND;VALUE=DATE:20260905');
    expect(body).not.toContain('T190000');

    const google = new URL(
      screen.getByRole('link', { name: /Google Calendar/ }).getAttribute('href')!,
    );
    expect(google.searchParams.get('dates')).toBe('20260904/20260905');
  });
});
