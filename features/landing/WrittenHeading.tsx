import type { CSSProperties, ReactNode } from 'react';

/**
 * A heading that writes itself, with a caret running ahead of the words.
 *
 * The earlier version had each word rise from behind a mask. This one is being *typed*:
 * each word is uncovered a character at a time by a `clip-path` stepped to its own
 * length, and a gold caret sits at the uncovered edge and moves with it. The caret is
 * what sells it — a wipe on its own reads as a transition, and a wipe with something
 * leading it reads as writing.
 *
 * Three things are load-bearing.
 *
 * **The string is never split into characters.** `steps()` takes a *count*, so the word
 * stays one intact text node and only its length is measured. This matters for Hebrew,
 * where `[...string]` tears combining marks off their letters and hands a screen reader a
 * stream of fragments. Counting is safe where splitting is not, and a miscount would cost
 * nothing but a slightly different rhythm.
 *
 * **The reveal is per word, not per line.** A single `clip-path` sweep across a whole
 * heading would uncover every line of a wrapped heading at once — the second line's
 * opening appearing before the first line's end, with one caret stranded across both. At
 * 320px almost every heading on this site wraps. Words never break, so a per-word sweep
 * is the version that survives a narrow phone, and the caret moves down to the next line
 * on its own because it belongs to the word rather than to the heading.
 *
 * **The delays accumulate by character, not by word index.** A fixed step per word makes
 * the caret lurch — it crosses "את" at the same rate as "המוזמנים". Offsetting each word
 * by the number of characters before it gives one constant writing speed across the whole
 * heading, which is the difference between a typing effect and a stagger.
 */

/** Milliseconds per character. The whole rhythm of the effect is this number. */
const MS_PER_CHARACTER = 32;

/**
 * How long `text` takes to write, in seconds.
 *
 * Exported so a caller stacking one line after another can start the second exactly as
 * the first finishes, and the caret carries straight on rather than restarting. Written
 * as a function so the two cannot drift apart the way a hand-tuned delay would.
 */
export function writingDuration(text: string): number {
  return (text.replace(/\s/g, '').length * MS_PER_CHARACTER) / 1000;
}

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
   * `'load'` for a heading on screen when the page arrives. `'scroll'` for one below the
   * fold, where a clock is the wrong trigger — the writing would be long finished by the
   * time the reader got there, and they would arrive at a heading that had already done
   * the thing.
   */
  readonly trigger?: 'load' | 'scroll';
}): ReactNode {
  const words = text.split(' ').filter(Boolean);
  const scrollDriven = trigger === 'scroll';

  // Characters written before each word begins, which is what makes the caret travel at
  // one speed rather than jump one word per tick. Quadratic over a handful of words, and
  // worth it to keep this a plain expression rather than a counter mutated mid-render.
  const offsets = words.map((_, index) =>
    words.slice(0, index).reduce((sum, word) => sum + word.length, 0),
  );

  return (
    <Tag className={className}>
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
         *
         * Scroll and load carry the offset differently: a scroll timeline has no clock, so
         * there the offset becomes a later *range* and CSS reads it as a scroll distance
         * rather than as a time.
         */
        const style: Record<string, string | number> = {
          '--chars': word.length,
          // A ready-made time rather than something CSS has to compute.
          //
          // `animation-duration: calc(var(--chars) * 32ms)` works on the word and silently
          // collapses to nothing on its `::after` in Chromium — the caret's duration came
          // back as 0.00001s while its step count resolved correctly from the same
          // variable. So the caret raced to its end instantly and sat there lit. Handing
          // CSS a plain `<time>` to substitute avoids the whole question.
          '--write-dur': `${(word.length * MS_PER_CHARACTER) / 1000}s`,
          ...(scrollDriven
            ? { '--write-offset': offset }
            : { '--write-delay': `${delay + (offset * MS_PER_CHARACTER) / 1000}s` }),
        };

        return (
          // The space is a sibling of the word rather than a child, so nothing can clip
          // it away — the earlier mask swallowed every space and rendered the heading as
          // one run-on string.
          <span key={`${word}-${index}`} aria-hidden="true">
            <span
              className={scrollDriven ? 'written-word written-word-scroll' : 'written-word'}
              style={style as CSSProperties}
            >
              {word}
            </span>
            {index < words.length - 1 ? ' ' : null}
          </span>
        );
      })}
    </Tag>
  );
}
