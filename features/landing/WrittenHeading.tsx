'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

import { MS_PER_CHARACTER, seconds } from '@/features/landing/writingPace';

/**
 * A heading that writes itself, with a caret running ahead of the words.
 *
 * Each word is uncovered a character at a time by a `clip-path` stepped to its own length,
 * with a gold caret sitting at the uncovered edge and moving with it. The caret is what
 * sells it — a wipe on its own reads as a transition; a wipe with something leading it
 * reads as writing.
 *
 * Four things are load-bearing.
 *
 * **The string is never split into characters.** `steps()` takes a *count*, so the word
 * stays one intact text node and only its length is measured. This matters for Hebrew,
 * where `[...string]` tears combining marks off their letters and hands a screen reader a
 * stream of fragments. Counting is safe where splitting is not, and a miscount would cost
 * nothing but a slightly different rhythm.
 *
 * **The reveal is per word, not per line.** A single sweep across a whole heading would
 * uncover every line of a wrapped one at once — the second line's opening appearing before
 * the first line's end, with one caret stranded across both. At 320px almost every heading
 * on this site wraps. Words never break, so a per-word sweep survives a narrow phone, and
 * the caret moves down to the next line on its own because it belongs to the word.
 *
 * **The delays accumulate by character, not by word index.** A fixed step per word makes
 * the caret lurch — it would cross "את" at the same rate as "המוזמנים". Offsetting each
 * word by the characters before it gives one constant speed across the heading, which is
 * the difference between typing and a stagger.
 *
 * **Scroll starts it; a clock runs it.** See `trigger` below — the part that took two
 * attempts to get right.
 */

/**
 * When a heading counts as reached: 12% up from the bottom edge, so writing starts once
 * it is properly in view rather than the instant its first pixel appears.
 *
 * A note for anyone tempted to extend the top of the root, as I was. The worry is real in
 * principle — `IntersectionObserver` reports crossings, so an element that goes from below
 * the viewport to above it with no frame in between is zero on both sides and reports
 * nothing, which here would mean a heading left armed and permanently invisible. It does
 * not happen. Scrolling the entire page in one `scrollTo`, past three headings at once,
 * still writes all three: measured at every viewport, with and without a 10000px top
 * margin, identical results. Chromium reports the transition.
 *
 * The QA finding that sent me looking was my own bad assertion — a fully written word is
 * `clip-path: inset(0px 0px 0px 0px)`, not `none`, and the check was testing for `none`.
 */
const ROOT_MARGIN = '0px 0px -12% 0px';

/** Hidden, waiting for the reader. Only ever added by the client. */
const ARMED = 'written-word-armed';

/** Running, on a clock. */
const WRITING = 'written-word-writing';

export function WrittenHeading({
  text,
  className,
  delay = 0,
  as: Tag = 'span',
  trigger = 'load',
}: {
  readonly text: string;
  readonly className?: string;
  /** Seconds before the first character appears, for stacking one line after another. */
  readonly delay?: number;
  readonly as?: 'span' | 'div';
  /**
   * What starts the writing.
   *
   * `'load'` for a heading on screen when the page arrives — pure CSS, running at first
   * paint without waiting for hydration.
   *
   * `'scroll'` for one below the fold, where a clock alone is the wrong trigger: the
   * writing would be long finished by the time anyone reached it. This used to be
   * `animation-timeline: view()`, which tied progress to scroll position and had two
   * faults that are really one fault — **the reader controlled the pace**. Flick past and
   * the heading was typed in a single frame; stop half way and it stayed half typed
   * indefinitely. An observer now decides *when*, and the clock decides *how fast*.
   */
  readonly trigger?: 'load' | 'scroll';
}): ReactNode {
  const ref = useRef<HTMLElement>(null);

  /*
   * Arming and writing are done by moving classes on the DOM, not by React state.
   *
   * Partly because `setState` inside an effect costs a second render of every word for a
   * change React has no stake in, and partly because it is the honest description: the
   * markup is React's and the decoration is not. React re-renders these headings never —
   * their props are static — and it patches an attribute only when its own rendered value
   * changes, so a class added here is not reconciled away.
   *
   * What the server renders is the bare `written-word`: no clip, no animation, just the
   * words. That is the whole reason an observer is acceptable here at all. `.reveal` in
   * `globals.css` rejects one because a JavaScript-dependent reveal "leaves the content
   * invisible until hydration" — a sound objection to hiding on the *server*, and not an
   * objection to the observer. Nothing hides until the client is already holding the thing
   * that will un-hide it, so JavaScript never arriving leaves a heading that does not
   * animate, never one that is not there.
   */
  useEffect(() => {
    if (trigger !== 'scroll') return;
    const element = ref.current;
    if (element === null) return;

    // Nothing is hidden from a reader who asked for stillness, so there is nothing to
    // reveal and no observer to keep. The stylesheet neutralises the classes too, but not
    // arming in the first place is what makes that a backstop rather than the mechanism.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // `IntersectionObserver` is everywhere this app runs, but a missing one would mean a
    // heading armed with nothing left to disarm it — permanently blank. Cheap to rule out.
    if (typeof IntersectionObserver === 'undefined') return;

    const words = [...element.querySelectorAll<HTMLElement>('.written-word')];
    for (const word of words) word.classList.add(ARMED);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          for (const word of words) {
            word.classList.remove(ARMED);
            word.classList.add(WRITING);
          }
          // Once written, written. Re-running it on the way back up would make scrolling
          // past a heading twice feel like the page had lost its place.
          observer.disconnect();
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [trigger]);

  const words = text.split(' ').filter(Boolean);

  // Characters written before each word begins, which is what makes the caret travel at
  // one speed rather than jump one word per tick. Quadratic over a handful of words, and
  // worth it to keep this a plain expression rather than a counter mutated mid-render.
  const offsets = words.map((_, index) =>
    words.slice(0, index).reduce((sum, word) => sum + word.length, 0),
  );

  // A load heading is written by CSS alone, at first paint and without waiting for
  // hydration. A scroll one starts as plain text and the effect above takes it from there.
  const wordClass = trigger === 'scroll' ? 'written-word' : `written-word ${WRITING}`;

  return (
    // `as never` because `Tag` is a union of two element types and a single ref cannot be
    // typed for both; the effect only ever reads it as an `Element`.
    <Tag className={className} ref={ref as never}>
      {/*
        The sentence, once, for assistive technology.

        `aria-label` on this wrapper is prohibited — a <span> with no role is not a valid
        target for it, so the label was both invalid and, in some screen readers, ignored,
        leaving a heading that announced as a list of disconnected words. A visually
        hidden text node is the boring, correct answer.
      */}
      <span className="sr-only">{text}</span>
      {words.map((word, index) => {
        const offset = offsets[index] ?? 0;

        /*
         * Everything goes across as a custom property, including the delay.
         *
         * The caret is a `::after` on the word, and `animation-delay` is not inherited —
         * setting it as a real property here would time the word and leave the caret
         * running from zero, so every caret on the line would set off at once and none of
         * them would be anywhere near the edge it is meant to be marking. Custom
         * properties do reach a pseudo-element, so the two stay locked together.
         */
        const style: Record<string, string | number> = {
          '--chars': word.length,
          // A ready-made time rather than something CSS has to compute.
          //
          // `animation-duration: calc(var(--chars) * 38ms)` works on the word and silently
          // collapses to nothing on its `::after` in Chromium — the caret's duration came
          // back as 0.00001s while its step count resolved correctly from the same
          // variable. So the caret raced to its end instantly and sat there lit. Handing
          // CSS a plain `<time>` to substitute avoids the whole question.
          '--write-dur': `${seconds(word.length * MS_PER_CHARACTER)}s`,
          '--write-delay': `${seconds(delay * 1000 + offset * MS_PER_CHARACTER)}s`,
        };

        return (
          // The space is a sibling of the word rather than a child, so nothing can clip
          // it away — an earlier mask swallowed every space and rendered the heading as
          // one run-on string.
          <span key={`${word}-${index}`} aria-hidden="true">
            <span className={wordClass} style={style as CSSProperties}>
              {word}
            </span>
            {index < words.length - 1 ? ' ' : null}
          </span>
        );
      })}
    </Tag>
  );
}
