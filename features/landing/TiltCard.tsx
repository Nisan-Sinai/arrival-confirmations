'use client';

import { useRef, useState, type ReactNode } from 'react';

/**
 * The invitation card, tilting toward the pointer.
 *
 * A shadow says an object is lying on a surface. Tilting toward the cursor says it is a
 * *physical* object in a room with you — the difference between a picture of a card and
 * a card. It is the one interaction on this page that responds continuously rather than
 * on a click, and it is what the reference site does constantly.
 *
 * Mechanics worth stating:
 *
 *   * **`perspective` on the wrapper, `rotate` on the child.** Perspective set on the
 *     rotating element itself is measured from that element's own centre, so the vanishing
 *     point travels with it and the tilt looks like a shear rather than a rotation.
 *   * **The rotation is written to a CSS variable, not to `style.transform`.** The
 *     transition, the resting rotation and the hover lift all live in the stylesheet, and
 *     mixing a JS-set transform with a CSS-set one means whichever wrote last wins.
 *   * **`pointermove` on the element rather than the window.** No listener runs while the
 *     cursor is anywhere else on the page, which for a decorative effect is the whole
 *     budget.
 *   * **Pointer only.** `(hover: hover)` in the stylesheet keeps this off touch devices,
 *     where there is no cursor to follow and a tilt on tap would just look like a bug.
 *
 * Nine degrees is the ceiling. Past about twelve the card's own gold rule starts to
 * visibly alias along its diagonal, and the thing stops reading as paper.
 */
const MAX_DEGREES = 9;

export function TiltCard({ children }: { readonly children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (element === null) return;

    const rect = element.getBoundingClientRect();
    // -0.5 to 0.5 from the centre, on both axes.
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;

    // Y drives rotateY and X drives rotateX, and rotateX is negated: a pointer near the
    // top should tip the top edge away, which is a negative rotation about X.
    setTilt({ x: -py * MAX_DEGREES * 2, y: px * MAX_DEGREES * 2 });
  };

  return (
    <div
      ref={ref}
      className="tilt-scene"
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      style={
        {
          '--tilt-x': `${tilt.x.toFixed(2)}deg`,
          '--tilt-y': `${tilt.y.toFixed(2)}deg`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
