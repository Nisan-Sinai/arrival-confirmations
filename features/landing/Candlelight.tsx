/**
 * Dust in candlelight.
 *
 * The reference the client pointed at was a WebGL agency site: near-black, particles at
 * several depths, everything faintly luminous and never quite still. That register is
 * wrong for this product — it sells invitations to family simchas and is read by older
 * guests on phones — but the *mechanism* behind the impression translates exactly, and
 * it translates on-brand. A simcha is a candlelit room. A candlelit room has dust in the
 * air, lit from the side, drifting.
 *
 * So: motes rather than particles, gold rather than cyan, and slow enough to read as
 * atmosphere instead of as an effect.
 *
 * Three depths, and the depth is what does the work. The far layer is small, faint and
 * slow; the near layer is larger, brighter and quicker. A single layer of identical dots
 * is confetti — it reads as decoration stuck to the glass. Different rates at different
 * scales is what the eye interprets as air between things.
 *
 * The positions are a fixed table rather than `Math.random()`. Random would differ
 * between the server render and the client one and produce a hydration mismatch, and it
 * would also mean nobody could ever reproduce a frame that looked wrong. Hand-placed
 * values are reviewable.
 */

interface Mote {
  /** Percentage across the container. */
  readonly x: number;
  /** Diameter in pixels — the whole depth cue, along with duration and opacity. */
  readonly size: number;
  /** Seconds for one drift. Far motes take longer. */
  readonly duration: number;
  /** Negative seconds, so the field is already in motion on the first frame rather
      than every mote starting from the floor together. */
  readonly delay: number;
  readonly opacity: number;
}

const MOTES: readonly Mote[] = [
  // Far — small, faint, slow.
  { x: 6, size: 3, duration: 34, delay: -4, opacity: 0.5 },
  { x: 17, size: 3, duration: 40, delay: -19, opacity: 0.22 },
  { x: 29, size: 5, duration: 37, delay: -11, opacity: 0.26 },
  { x: 44, size: 3, duration: 43, delay: -27, opacity: 0.2 },
  { x: 58, size: 3, duration: 36, delay: -8, opacity: 0.26 },
  { x: 71, size: 3, duration: 41, delay: -22, opacity: 0.22 },
  { x: 86, size: 3, duration: 38, delay: -15, opacity: 0.25 },
  { x: 95, size: 3, duration: 45, delay: -31, opacity: 0.2 },
  // Middle.
  { x: 11, size: 5, duration: 27, delay: -13, opacity: 0.4 },
  { x: 34, size: 6, duration: 24, delay: -3, opacity: 0.36 },
  { x: 52, size: 5, duration: 29, delay: -20, opacity: 0.42 },
  { x: 66, size: 5, duration: 26, delay: -9, opacity: 0.34 },
  { x: 79, size: 5, duration: 31, delay: -24, opacity: 0.38 },
  { x: 91, size: 5, duration: 25, delay: -6, opacity: 0.36 },
  // Near — larger, brighter, quicker.
  { x: 22, size: 9, duration: 19, delay: -7, opacity: 0.5 },
  { x: 48, size: 10, duration: 17, delay: -14, opacity: 0.45 },
  { x: 74, size: 9, duration: 21, delay: -2, opacity: 0.48 },
];

export function Candlelight() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {MOTES.map((mote, index) => (
        <span
          key={index}
          className="mote"
          style={{
            insetInlineStart: `${mote.x}%`,
            width: `${mote.size}px`,
            height: `${mote.size}px`,
            // A custom property, not `opacity`: the keyframes animate opacity to fade
            // each mote in and out at the ends of its travel, and an inline value would
            // be overridden the moment the animation starts.
            ['--mote-opacity' as string]: String(mote.opacity),
            animationDuration: `${mote.duration}s`,
            animationDelay: `${mote.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
