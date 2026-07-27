import { toVisualSegments } from '@/lib/ogText';

/**
 * One line of Hebrew on a share image (§12).
 *
 * Satori draws glyphs in memory order and has no bidirectional algorithm, so every
 * string on these cards goes through `toVisualSegments` first. What arrives here is a
 * list of words already reordered for a left-to-right renderer, still in reading order.
 *
 * Laying them out as separate boxes rather than as one string is what makes wrapping
 * work. `row-reverse` puts the first word furthest right and `wrap` sends the overflow
 * to a new line below — so a long name breaks where a reader expects, instead of
 * opening with its own last word. It is also why the gap between words is a `columnGap`
 * and not a space character: a gap applies only *between* boxes on a line, so a wrapped
 * line has no trailing space to push its centring off.
 */

/**
 * Word spacing, as a fraction of the font size. Both vendored families advance the
 * space glyph by about a quarter of the em; matching that keeps this indistinguishable
 * from ordinary text set by the renderer itself.
 */
const WORD_GAP_EM = 0.26;

interface OgTextProps {
  readonly children: string;
  /**
   * Required, and not merely part of `style`, because the word gap is derived from it.
   * A size that arrived through the cascade would be invisible here — Satori has no
   * cascade, but neither does this component.
   */
  readonly fontSize: number;
  readonly style?: React.CSSProperties;
}

export function OgText({ children, fontSize, style }: OgTextProps) {
  const segments = toVisualSegments(children);
  if (segments.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: fontSize * WORD_GAP_EM,
        fontSize,
        ...style,
      }}
    >
      {segments.map((segment, index) => (
        // Two words of a name can repeat, so the index is part of the key.
        <div key={`${index}:${segment}`} style={{ display: 'flex' }}>
          {segment}
        </div>
      ))}
    </div>
  );
}
