import type { ReactNode } from 'react';

/**
 * A heading whose words rise into view one after another, each from behind its own mask.
 *
 * The effect is a clipping window per word: the word starts below the line, the mask cuts
 * it off, and it slides up into place. Nothing fades — the edge stays hard, which is what
 * makes it read as typesetting rather than as a cross-dissolve.
 *
 * **Split by word, not by character.** Character-splitting is the usual way to do this
 * and it is wrong for Hebrew: the script has combining marks and final forms, and a naive
 * `[...string]` breaks graphemes apart and hands a screen reader a stream of letters. Word
 * boundaries are safe in both languages this site ships.
 *
 * The whole heading keeps its text in the DOM as one accessible string via `aria-label`,
 * with the animated spans hidden from assistive technology. A screen reader hears the
 * sentence; a sighted reader watches it arrive.
 *
 * `--stagger` sets the step between words. 70ms is fast enough that a five-word line
 * finishes in under half a second and nobody waits for the page.
 */
export function KineticHeading({
  text,
  className,
  delay = 0,
  as: Tag = 'span',
}: {
  readonly text: string;
  readonly className?: string;
  /** Seconds before the first word moves, for staggering one line after another. */
  readonly delay?: number;
  readonly as?: 'span' | 'div';
}): ReactNode {
  const words = text.split(' ').filter(Boolean);

  return (
    <Tag className={className}>
      {/*
        The sentence, once, for assistive technology.

        The first version put `aria-label` on this wrapper, and axe was right to reject
        it: a `<span>` with no role is a prohibited target for the attribute, so the label
        was both invalid and — in some screen readers — ignored, leaving a heading that
        announced as a list of disconnected words. A visually hidden text node is the
        boring, correct answer.
      */}
      <span className="sr-only">{text}</span>
      {words.map((word, index) => (
        // A fragment so the space is a sibling of the mask rather than a child of it.
        // Inside, `overflow: clip` swallows it and the heading renders as one run-on
        // string — which is exactly what the first version did.
        <span key={`${word}-${index}`} aria-hidden="true">
          <span
            aria-hidden="true"
            /* `inline-block` with clipped overflow is the mask; the inner span is what
               moves. A single element cannot both clip and be clipped. */
            className="kinetic-mask"
          >
            <span className="kinetic-word" style={{ animationDelay: `${delay + index * 0.07}s` }}>
              {word}
            </span>
          </span>
          {index < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </Tag>
  );
}
