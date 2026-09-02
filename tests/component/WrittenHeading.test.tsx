import { act, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrittenHeading } from '@/features/landing/WrittenHeading';
import { writingDuration } from '@/features/landing/writingPace';

/**
 * A recorded observer, so a test can say "the reader reached it" without a viewport.
 *
 * jsdom has neither `IntersectionObserver` nor a layout to observe, and the component
 * treats a missing one as a reason not to arm at all — so without this stub every scroll
 * test would pass by taking the bail-out path and proving nothing.
 */
class FakeObserver {
  disconnected = false;
  constructor(private readonly callback: IntersectionObserverCallback) {
    observers.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

let observers: FakeObserver[] = [];
let reducedMotion = false;

beforeEach(() => {
  observers = [];
  reducedMotion = false;
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion: reduce') && reducedMotion,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  describe('triggered by scroll', () => {
    it('sends plain, unhidden text from the server', () => {
      // Rendered on the server, where no effect runs — which is exactly the state a reader
      // keeps if the JavaScript never arrives. Asserted here rather than through `render`
      // because that flushes effects immediately, so the armed state is all it can ever
      // see, and the one state worth guarding would go untested.
      //
      // This is what makes an observer acceptable at all. `.reveal` in globals.css rules
      // one out because a JavaScript-dependent reveal "leaves the content invisible until
      // hydration" — true of hiding on the server, which is precisely what this refuses to
      // do. Regress it and the heading is blank for anyone whose bundle fails.
      const html = renderToStaticMarkup(
        <WrittenHeading as="div" text="אחת שתיים שלוש" trigger="scroll" />,
      );

      expect(html).not.toContain('written-word-armed');
      expect(html).not.toContain('written-word-writing');
      expect(html).toContain('אחת');
      expect(html).toContain('שתיים');
      expect(html).toContain('שלוש');
    });

    it('arms every word once observed, then writes them on reaching the viewport', () => {
      const { container } = render(
        <WrittenHeading as="div" text="אחת שתיים שלוש" trigger="scroll" />,
      );
      const words = [...container.querySelectorAll<HTMLElement>('.written-word')];

      expect(observers).toHaveLength(1);
      expect(words.every((w) => w.classList.contains('written-word-armed'))).toBe(true);

      act(() => observers[0]!.trigger(true));

      expect(words.every((w) => w.classList.contains('written-word-writing'))).toBe(true);
      expect(words.some((w) => w.classList.contains('written-word-armed'))).toBe(false);
    });

    it('keeps the clock timings, so the pace does not depend on how fast anyone scrolls', () => {
      const { container } = render(
        <WrittenHeading as="div" text="אחת שתיים שלוש" trigger="scroll" />,
      );
      act(() => observers[0]!.trigger(true));

      // The whole point of the observer: it decides *when*, the clock decides *how fast*.
      // A scroll-driven timeline gave the reader both, so flicking past typed a heading in
      // one frame and stopping half way left it half typed for good.
      const words = [...container.querySelectorAll<HTMLElement>('.written-word')];
      expect(words.map((w) => w.style.getPropertyValue('--write-delay'))).toEqual([
        '0s',
        '0.114s',
        '0.304s',
      ]);
    });

    it('stops observing once written, so scrolling back up does not rewrite it', () => {
      render(<WrittenHeading as="div" text="אחת שתיים" trigger="scroll" />);

      act(() => observers[0]!.trigger(true));
      expect(observers[0]!.disconnected).toBe(true);
    });

    it('never arms a heading for a reader who asked for stillness', () => {
      reducedMotion = true;
      const { container } = render(<WrittenHeading as="div" text="אחת שתיים" trigger="scroll" />);

      // Not arming is the mechanism; the stylesheet override is only a backstop. If this
      // regressed, the heading would be hidden with nothing left to reveal it.
      expect(observers).toHaveLength(0);
      const words = [...container.querySelectorAll<HTMLElement>('.written-word')];
      expect(words.some((w) => w.className !== 'written-word')).toBe(false);
    });
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
