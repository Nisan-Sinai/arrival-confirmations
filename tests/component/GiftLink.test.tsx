import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GiftLink } from '@/features/invite/GiftLink';

/**
 * Where to send a gift.
 *
 * The absent case is the one that matters most: an invitation that says "want to send a
 * gift?" when the host never provided anywhere to send it is an invitation asking for
 * money and offering no way to give it. Most events will not set a link.
 */
describe('GiftLink', () => {
  it('offers the link the host provided', () => {
    render(<GiftLink url="https://www.bitpay.co.il/app/me/ABC" />);

    const link = screen.getByRole('link', { name: /מתנה/ });
    expect(link).toHaveAttribute('href', 'https://www.bitpay.co.il/app/me/ABC');
  });

  it('opens payment pages in a new tab without handing back an opener', () => {
    // These are payment pages. A live `window.opener` back into the invitation is the one
    // link on this site where that would genuinely matter.
    render(<GiftLink url="https://payboxapp.page.link/xyz" />);

    const link = screen.getByRole('link', { name: /מתנה/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('names no provider, so a changed share link cannot break it', () => {
    // Bit and PayBox have both changed the shape of their links more than once, and a
    // bank page is just as valid an answer. Nothing may sniff the URL.
    render(<GiftLink url="https://www.example-bank.co.il/transfer/12345" />);

    expect(screen.getByRole('link', { name: /מתנה/ })).toBeInTheDocument();
    expect(screen.queryByText(/bit|paybox/i)).not.toBeInTheDocument();
  });

  it('renders nothing when the host set no link', () => {
    const { container } = render(<GiftLink url={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('treats a blank or whitespace link as no link', () => {
    for (const value of ['', '   ']) {
      const { container } = render(<GiftLink url={value} />);
      expect(container).toBeEmptyDOMElement();
    }
  });

  it('meets the 24px target size with room to spare', () => {
    // WCAG 2.2 SC 2.5.8, and this is a link a guest taps on a phone with one thumb.
    render(<GiftLink url="https://www.bitpay.co.il/app/me/ABC" />);

    expect(screen.getByRole('link', { name: /מתנה/ }).className).toContain('min-h-11');
  });
});
