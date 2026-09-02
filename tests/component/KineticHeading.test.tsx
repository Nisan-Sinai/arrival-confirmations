import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KineticHeading } from '@/features/landing/KineticHeading';

/**
 * A heading split into words that arrive one after another.
 *
 * Everything asserted here is a bug that was actually shipped into a preview and caught
 * by eye rather than by a test, which is the reason the file exists.
 *
 * The stakes are higher than decoration: this component now sets the headings on the
 * pricing page, the legal pages and the guest-facing RSVP form. A regression is not a
 * dull animation, it is a heading that reads as one run-on word or announces as a stream
 * of disconnected fragments.
 */
describe('KineticHeading', () => {
  it('keeps the sentence intact for assistive technology', () => {
    render(<KineticHeading as="div" text="מנהלים את המוזמנים" />);

    // The visible words are `aria-hidden`, so the only text left to the accessibility
    // tree is the single hidden node. The first version put `aria-label` on the wrapping
    // <span> instead — prohibited on a element with no role, so the label was invalid and
    // in some screen readers simply ignored.
    expect(screen.getByText('מנהלים את המוזמנים')).toHaveClass('sr-only');
  });

  it('renders the words separated by spaces', () => {
    const { container } = render(<KineticHeading as="div" text="מנהלים את המוזמנים" />);

    const words = container.querySelectorAll('.kinetic-word');
    expect([...words].map((word) => word.textContent)).toEqual(['מנהלים', 'את', 'המוזמנים']);

    // The tree holds the sentence twice — the hidden copy, then the animated words — and
    // the two abut with nothing between them, so the visible half has to be read on its
    // own. It is the half that matters: the separator was originally *inside* the mask,
    // where `overflow: clip` swallowed it and the heading rendered "מנהליםאתהמוזמנים".
    const visible = container.textContent?.slice('מנהלים את המוזמנים'.length);
    expect(visible).toBe('מנהלים את המוזמנים');
  });

  it('staggers on a clock when it is triggered by load', () => {
    const { container } = render(<KineticHeading as="div" text="אחת שתיים שלוש" delay={0.18} />);

    const words = [...container.querySelectorAll<HTMLElement>('.kinetic-word')];
    expect(words.map((word) => word.style.animationDelay)).toEqual(['0.18s', '0.25s', '0.32s']);
    expect(words.some((word) => word.classList.contains('kinetic-word-scroll'))).toBe(false);
  });

  it('staggers by index when it is triggered by scroll', () => {
    const { container } = render(
      <KineticHeading as="div" text="אחת שתיים שלוש" trigger="scroll" />,
    );

    const words = [...container.querySelectorAll<HTMLElement>('.kinetic-word')];

    // The index, not a delay. A scroll timeline has no clock to delay against, so a
    // `animationDelay` here would be silently ignored and all three words would arrive
    // together — the stagger disappearing without anything failing.
    expect(words.map((word) => word.style.getPropertyValue('--word-index'))).toEqual([
      '0',
      '1',
      '2',
    ]);
    expect(words.every((word) => word.style.animationDelay === '')).toBe(true);
    expect(words.every((word) => word.classList.contains('kinetic-word-scroll'))).toBe(true);
  });

  it('ignores repeated spaces rather than emitting empty words', () => {
    const { container } = render(<KineticHeading as="div" text="  אחת   שתיים  " />);

    expect(container.querySelectorAll('.kinetic-word')).toHaveLength(2);
  });
});
