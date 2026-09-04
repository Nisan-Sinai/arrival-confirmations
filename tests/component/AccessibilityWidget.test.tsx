import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AccessibilityWidget } from '@/features/accessibility/AccessibilityWidget';

const STORAGE_KEY = 'arrival-confirmations:a11y';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  document.documentElement.style.fontSize = '';
  delete document.documentElement.dataset.a11yContrast;
  delete document.documentElement.dataset.a11yGrayscale;
  delete document.documentElement.dataset.a11yLinks;
  delete document.documentElement.dataset.a11yMotion;
});

describe('AccessibilityWidget', () => {
  it('moves focus into the panel and restores it when the panel closes', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget locale="he" />);

    const trigger = screen.getByRole('button', { name: 'פתיחת תפריט נגישות' });
    await user.click(trigger);

    const close = screen.getByRole('button', { name: 'סגירת תפריט נגישות' });
    expect(close).toHaveFocus();

    await user.click(close);
    expect(trigger).toHaveFocus();
  });

  it('constrains persisted values instead of applying corrupted settings', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ fontScale: 900, contrast: 'yes', grayscale: true }),
    );

    render(<AccessibilityWidget locale="en" />);

    expect(document.documentElement.style.fontSize).toBe('140%');
    expect(document.documentElement.dataset.a11yContrast).toBe('false');
    expect(document.documentElement.dataset.a11yGrayscale).toBe('true');
  });

  it('keeps the panel scrollable inside short viewports at enlarged text sizes', async () => {
    const user = userEvent.setup();
    render(<AccessibilityWidget locale="en" />);

    await user.click(screen.getByRole('button', { name: 'Open accessibility menu' }));
    expect(screen.getByRole('region', { name: 'Accessibility tools' })).toHaveClass(
      'max-h-[calc(100dvh-6rem)]',
      'overflow-y-auto',
    );
  });
});
