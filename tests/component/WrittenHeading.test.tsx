import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WrittenHeading, writingDuration } from '@/features/landing/WrittenHeading';

/**
 * A heading that types itself.
 *
 * Everything asserted here is a bug that reached a preview and was caught by eye rather
 * than by a test, which is why the file exists.
 *
 * The stakes are higher than decoration: this sets the headings on the landing page, the
 * pricing page, the legal pages and the guest-facing RSVP form. A regression is not a dull
 * animation — it is a heading that reads as one run-on word, or announces to a screen
 * reader as a stream of disconnected fragments.
 */
describe('WrittenHeading', () => {
  it('keeps the sentence intact for assistive technology', () => {
    render(<WrittenHeading as="div" text="מנהלים את המוזמנים" />);

    // The visible words are all `aria-hidden`, so the only text left in the accessibility
    // tree is this one hidden node. An earlier version put `aria-label` on the wrapping
    // <span> instead — prohibited on an element with no role, so the label was invalid and
    // in some screen readers simply ignored.
    expect(screen.getByText('מנהלים את המוזמנים')).toHaveClass('sr-only');
  });

  it('renders the words separated by spaces', () => {
    const { container } = render(<WrittenHeading as="div" text="מנהלים את המוזמנים" />);

    const words = container.querySelectorAll('.written-word');
    expect([...words].map((word) => word.textContent)).toEqual(['מנהלים', 'את', 'המוזמנים']);

    // The tree holds the sentence twice — the hidden copy, then the written words — and
    // the two abut with nothing between them, so the visible half is read on its own. It
    // is the half that matters: the separator used to sit inside a clipping mask, which
    // swallowed it and rendered "מנהליםאתהמוזמנים".
    const visible = container.textContent?.slice('מנהלים את המוזמנים'.length);
    expect(visible).toBe('מנהלים את המוזמנים');
  });

  it('never splits a word into characters', () => {
    // The reason `steps()` is given a count rather than the text being split up: spreading
    // a Hebrew string tears combining marks and final forms off their letters. Each word
    // must remain exactly one text node.
    const { container } = render(<WrittenHeading as="div" text="בשמחה" />);

    const word = container.querySelector('.written-word');
    expect(word?.childNodes).toHaveLength(1);
    expect(word?.textContent).toBe('בשמחה');
  });

  it('paces the caret by character so it moves at one speed', () => {
    const { container } = render(<WrittenHeading as="div" text="אחת שתיים שלוש" />);

    const words = [...container.querySelectorAll<HTMLElement>('.written-word')];
    expect(words.map((w) => w.style.getPropertyValue('--chars'))).toEqual(['3', '5', '4']);

    // Delays accumulate by characters already written, not by word index. Stepping once
    // per word makes the caret lurch — it would cross "אחת" at the same rate as "שתיים".
    expect(words.map((w) => w.style.getPropertyValue('--write-delay'))).toEqual([
      '0s',
      '0.114s',
      '0.304s',
    ]);
  });

  it('carries the timing as a custom property, not as animation-delay', () => {
    const { container } = render(<WrittenHeading as="div" text="אחת שתיים" />);

    // The caret is a `::after` on the word, and `animation-delay` is not inherited by a
    // pseudo-element. Set as a real property, every caret on the line would start at zero
    // while its word waited its turn, leaving carets nowhere near the edge they mark.
    const words = [...container.querySelectorAll<HTMLElement>('.written-word')];
    expect(words.every((w) => w.style.animationDelay === '')).toBe(true);
  });

  it('offsets by scroll distance, not by time, when triggered by scroll', () => {
    const { container } = render(
      <WrittenHeading as="div" text="אחת שתיים שלוש" trigger="scroll" />,
    );

    const words = [...container.querySelectorAll<HTMLElement>('.written-word')];

    // A scroll timeline has no clock to delay against, so a delay here would be silently
    // ignored and the whole heading would write at once — the effect disappearing without
    // anything failing.
    expect(words.map((w) => w.style.getPropertyValue('--write-offset'))).toEqual(['0', '3', '8']);
    expect(words.every((w) => w.style.getPropertyValue('--write-delay') === '')).toBe(true);
    expect(words.every((w) => w.classList.contains('written-word-scroll'))).toBe(true);
  });

  it('ignores repeated spaces rather than emitting empty words', () => {
    const { container } = render(<WrittenHeading as="div" text="  אחת   שתיים  " />);

    expect(container.querySelectorAll('.written-word')).toHaveLength(2);
  });

  describe('writingDuration', () => {
    it('measures the line so a caller can start the next as this one ends', () => {
      // Spaces cost nothing — the caret jumps them — so only characters count.
      expect(writingDuration('אחת שתיים')).toBeCloseTo(0.304, 5);
      expect(writingDuration('')).toBe(0);
    });
  });

  it('emits clean times rather than binary floating point', () => {
    // A delay that lands on 0.9119999999999999 animates identically and reads as a bug
    // to anyone who opens the element inspector, so the arithmetic is done in whole
    // milliseconds before it becomes a string.
    const { container } = render(
      <WrittenHeading as="div" text="אחרי תשובות" delay={writingDuration('מנהלים את המוזמנים')} />,
    );

    for (const word of container.querySelectorAll<HTMLElement>('.written-word')) {
      for (const property of ['--write-delay', '--write-dur']) {
        const value = word.style.getPropertyValue(property);
        expect(value, `${property} on "${word.textContent}"`).toMatch(/^\d+(\.\d{1,3})?s$/);
      }
    }
  });
});
