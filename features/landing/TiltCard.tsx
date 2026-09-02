'use client';

import { useRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * A card that tilts toward the pointer.
 *
 * A shadow says an object is lying on a surface. Tilting toward the cursor says it is a
 * *physical* object in a room with you — the difference between a picture of a card and
 * a card. It is the one interaction on these pages that responds continuously rather than
 * on a click.
 *
 * Mechanics worth stating:
 *
 *   * **`perspective` on the wrapper, `rotate` on the child.** Perspective set on the
 *     rotating element itself is measured from that element's own centre, so the vanishing
 *     point travels with it and the tilt looks like a shear rather than a rotation. The
 *     component renders both elements rather than asking the caller to supply the inner
 *     one, so there is no way to use it wrongly.
 *   * **The rotation goes straight to the element, not through state.** The first version
 *     held the angles in `useState`, which re-rendered React on every `pointermove`. That
 *     was affordable for one hero card and is not for seven — a pointer crossing a grid
 *     of them would re-render a card per frame. Two `setProperty` calls do the same job
 *     and never touch the reconciler.
 *   * **`pointermove` on the element rather than the window.** No listener runs while the
 *     cursor is anywhere else on the page, which for a decorative effect is the whole
 *     budget.
 *   * **Pointer only.** `(hover: hover)` in the stylesheet keeps this off touch devices,
 *     where there is no cursor to follow and a tilt on tap would just look like a bug.
 *
 * Nine degrees is the ceiling for the big invitation card. Past about twelve its gold rule
 * starts to visibly alias along its diagonal and the thing stops reading as paper. The
 * small text cards take less — five — because the same angle on a short wide box reads as
 * the grid being crooked rather than as a card being tipped.
 */
export function TiltCard({
  children,
  degrees = 9,
  className,
}: {
  readonly children: ReactNode;
  /** Maximum rotation at a corner, in degrees. */
  readonly degrees?: number;
  /**
   * Classes for the outer element.
   *
   * Needed because wrapping a card in a tilt makes this element the one the grid sees.
   * `.reveal-stagger > *:nth-child(n)` selects *direct* children, so a `.reveal` left on
   * the card inside would be staggered by a selector that no longer reaches it — the
   * ranges landing on a wrapper that has no animation, and every card arriving at once.
   */
  readonly className?: string;
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const scene = sceneRef.current;
    const target = targetRef.current;
    if (scene === null || target === null) return;

    const rect = scene.getBoundingClientRect();
    // -0.5 to 0.5 from the centre, on both axes.
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;

    // Y drives rotateY and X drives rotateX, and rotateX is negated: a pointer near the
    // top should tip the top edge away, which is a negative rotation about X.
    target.style.setProperty('--tilt-x', `${(-py * degrees * 2).toFixed(2)}deg`);
    target.style.setProperty('--tilt-y', `${(px * degrees * 2).toFixed(2)}deg`);
  };

  const onLeave = () => {
    const target = targetRef.current;
    if (target === null) return;
    // Cleared rather than set to zero, so the resting value comes from the stylesheet.
    target.style.removeProperty('--tilt-x');
    target.style.removeProperty('--tilt-y');
  };

  return (
    <div
      ref={sceneRef}
      className={cn('tilt-scene', className)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div ref={targetRef} className="tilt-target">
        {children}
      </div>
    </div>
  );
}
