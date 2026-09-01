import type React from 'react';

import { cn } from '@/lib/utils';

/**
 * The brand mark.
 *
 * An envelope whose opening flap resolves into a tick. That is the whole idea, and it is
 * why this is not the stock envelope icon it replaced: the left flap falls the way a
 * flap does, the right one keeps going, past the envelope's own edge, and lands as a
 * confirmation. Invitation and answer in one stroke — which is the product.
 *
 * Three decisions worth writing down, because each one was the alternative's fault:
 *
 *   1. **No enclosing ring.** The mark used to sit inside a bordered circle, which cost
 *      it a third of its area and bought nothing: at the 36px it renders at in the
 *      header, the ring and the glyph competed for the same few pixels and the glyph
 *      lost. Removing it lets the drawing be the logo.
 *   2. **`--accent-strong`, not `--accent` at 40% opacity.** The old ring was
 *      `border-accent-strong/40`. Gold dimmed with opacity lands under 3:1 against warm
 *      paper — it looks tasteful on a designer's monitor and disappears on a phone in
 *      daylight, which is where an invitation is actually opened. `--accent-strong` is
 *      the one gold in the palette with the contrast to carry a line.
 *   3. **Drawn on a 24 grid at stroke 1.6.** Half-unit coordinates land on pixel
 *      boundaries at 36px and 48px, the two sizes it ships at, so the horizontals stay
 *      crisp instead of straddling a pixel and going soft.
 */
export function BrandMark({
  className,
  animated = false,
}: {
  className?: string;
  /**
   * Draw the tick on load. Public surfaces only — see `.mark-draw` in `globals.css`.
   */
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('text-accent-strong', className)}
    >
      {/*
        The envelope, with its top-right corner deliberately absent.

        The first attempt drew the full rectangle and ran the tick across it. Two strokes
        crossing inside a 36px square do not stay two strokes — they filled in and read as
        a smudge. Leaving the corner open lets the tick through clean, and the eye closes
        the rectangle on its own.
      */}
      <path d="M15.5 7.5H5a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6.5" />
      {/*
        One polyline, not two: the flap falls to the crease and the same gesture keeps
        going, past the envelope's own edge, and lands as a tick.

        The asymmetry is the whole trick, and it is in the *lengths*, not the angles.
        Both arms fall at roughly 45°, which is what keeps the flap legible as a flap.
        The right one is 1.6× the left and finishes above where the left one started,
        which is what makes the same shape read as a tick. An earlier draft had the arms
        near-equal and it read as a flap and nothing else.

        Drawn as a single path so the crease is one mitred join rather than two round
        caps meeting approximately.
      */}
      <path
        d="M3.4 9.4 10.5 16.5 21.9 5.4"
        className={animated ? 'mark-draw' : undefined}
        /*
         * The path's own length, to the unit: √(7.1² + 7.1²) + √(11.4² + 11.1²) ≈ 25.9,
         * rounded up so the dash always covers it and the stroke starts fully hidden.
         * Hard-coded because reading it back needs `getTotalLength()`, and a decoration
         * that only appears after hydration is worse than one that never moves.
         */
        style={animated ? ({ '--mark-length': '26' } as React.CSSProperties) : undefined}
      />
    </svg>
  );
}
