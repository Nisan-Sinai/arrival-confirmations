import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsConsent } from '@/app/analytics-consent';

vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/') }));
const config = {
  id: 'G-TEST123',
  origin: window.location.origin,
  name: 'Public site',
  paths: ['/', '/en', '/pricing'],
};
const win = window as Window & {
  publicAnalytics?: unknown;
  publicConsentOverride?: unknown;
  dataLayer?: unknown[];
  gtag?: unknown;
};
beforeEach(() => {
  localStorage.clear();
  vi.mocked(usePathname).mockReturnValue('/');
  delete win.publicAnalytics;
  delete win.publicConsentOverride;
  delete win.dataLayer;
  delete win.gtag;
  document.querySelector('#public-google-analytics')?.remove();
});
afterEach(() => {
  localStorage.clear();
  delete win.publicAnalytics;
  delete win.publicConsentOverride;
  delete win.dataLayer;
  delete win.gtag;
  document.querySelector('#public-google-analytics')?.remove();
});

describe('optional analytics consent', () => {
  it('starts with no Google script and persists an equal-choice rejection', async () => {
    const user = userEvent.setup();
    render(<AnalyticsConsent locale="he" config={config} />);
    expect(screen.getByRole('button', { name: 'אישור מדידה' })).toBeVisible();
    expect(document.querySelector('#public-google-analytics')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'ללא מדידה' }));
    expect(localStorage.getItem('public-analytics-consent-v1')).toBe('denied');
    expect(document.querySelector('#public-google-analytics')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'בחירת הפרטיות שלך' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'הגדרות פרטיות' }));
    expect(screen.getByRole('button', { name: 'אישור מדידה' })).toBeVisible();
  });
  it('loads one script only after consent and disables it on a private route', async () => {
    const user = userEvent.setup();
    const view = render(<AnalyticsConsent locale="en" config={config} />);
    await user.click(screen.getByRole('button', { name: 'Allow analytics' }));
    await waitFor(() =>
      expect(document.querySelectorAll('#public-google-analytics')).toHaveLength(1),
    );
    const commands = (win.dataLayer ?? []).map((args) => Array.from(args as IArguments));
    expect(commands.filter((args) => args[0] === 'event' && args[1] === 'page_view')).toHaveLength(
      1,
    );
    vi.mocked(usePathname).mockReturnValue('/e/private-token');
    view.rerender(<AnalyticsConsent locale="en" config={config} />);
    expect(screen.queryByRole('button', { name: 'Privacy settings' })).toBeNull();
    expect((window as unknown as Record<string, unknown>)['ga-disable-G-TEST123']).toBe(true);
  });
});
