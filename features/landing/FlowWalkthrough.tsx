/**
 * The walkthrough: a phone showing the three steps, cycling.
 *
 * This is the site's demo film, and it is drawn rather than filmed on purpose. A real
 * clip would be a megabyte or two to download before a visitor on a phone learns
 * anything, it would need a poster frame to avoid a blank rectangle while it loads, it
 * would need captions to be usable without sound, and it would go stale the first time a
 * button moved. Twelve seconds of SVG costs nothing, cannot buffer, and stays correct
 * because it is abstract.
 *
 * It also says nothing it would have to be careful about. A screen recording of this
 * product is a recording of somebody's guest list.
 *
 * No text inside the drawing, which is not laziness: it makes the same file correct in
 * Hebrew and English, and it keeps the animation from carrying meaning a screen reader
 * cannot reach. The whole thing is `aria-hidden`, and the steps beside it — real text,
 * from the dictionary — are what actually explain the product.
 *
 * Scenes are stacked in one grid cell rather than swapped, so nothing reflows as they
 * change: the box is the height of the tallest scene from the first frame.
 */
export function FlowWalkthrough() {
  return (
    <svg
      viewBox="0 0 220 391"
      fill="none"
      aria-hidden="true"
      className="h-full w-full"
      role="presentation"
    >
      {/* The handset. Drawn once, behind every scene. */}
      <rect
        x="6"
        y="6"
        width="208"
        height="379"
        rx="26"
        className="fill-white/5 stroke-white/25"
        strokeWidth="1.5"
      />
      <rect x="86" y="14" width="48" height="6" rx="3" className="fill-white/25" />

      {/* ---- Scene one: the invitation arrives in the thread ---- */}
      <g className="demo-scene demo-scene-1">
        <rect x="20" y="40" width="180" height="26" rx="8" className="fill-white/10" />
        <rect x="30" y="50" width="70" height="6" rx="3" className="fill-white/40" />

        <rect x="20" y="78" width="120" height="34" rx="10" className="fill-white/10" />
        <rect x="30" y="88" width="86" height="5" rx="2.5" className="fill-white/30" />
        <rect x="30" y="99" width="56" height="5" rx="2.5" className="fill-white/20" />

        {/* The one that slides in: the host's message, with the link. */}
        <g className="demo-bubble">
          <rect x="64" y="126" width="136" height="62" rx="12" className="fill-accent/25" />
          <rect x="76" y="138" width="100" height="5" rx="2.5" className="fill-white/60" />
          <rect x="76" y="149" width="76" height="5" rx="2.5" className="fill-white/40" />
          <rect x="76" y="166" width="112" height="12" rx="6" className="fill-accent/50" />
        </g>
      </g>

      {/* ---- Scene two: the guest answers ---- */}
      <g className="demo-scene demo-scene-2">
        <rect x="20" y="40" width="180" height="150" rx="14" className="fill-white/8" />
        {/* A gold rule, the way the real invitation is framed. */}
        <rect x="34" y="56" width="152" height="1.5" rx="0.75" className="fill-accent/50" />
        <rect x="60" y="72" width="100" height="7" rx="3.5" className="fill-white/55" />
        <rect x="76" y="88" width="68" height="5" rx="2.5" className="fill-white/30" />
        <rect x="34" y="176" width="152" height="1.5" rx="0.75" className="fill-accent/50" />

        {/* The three answers, with the first one chosen. */}
        <rect x="34" y="206" width="152" height="26" rx="13" className="fill-accent/70" />
        <rect x="72" y="216" width="76" height="6" rx="3" className="fill-white/80" />
        <rect x="34" y="240" width="152" height="22" rx="11" className="fill-white/10" />
        <rect x="34" y="270" width="152" height="22" rx="11" className="fill-white/10" />

        {/* The tap. */}
        <circle cx="110" cy="219" r="22" className="demo-tap fill-white" />
      </g>

      {/* ---- Scene three: the answers land on the dashboard ---- */}
      <g className="demo-scene demo-scene-3">
        <rect x="20" y="44" width="84" height="52" rx="12" className="fill-white/10" />
        <rect x="32" y="58" width="30" height="14" rx="4" className="fill-accent/70" />
        <rect x="32" y="78" width="46" height="5" rx="2.5" className="fill-white/30" />

        <rect x="116" y="44" width="84" height="52" rx="12" className="fill-white/10" />
        <rect x="128" y="58" width="24" height="14" rx="4" className="fill-white/50" />
        <rect x="128" y="78" width="40" height="5" rx="2.5" className="fill-white/30" />

        {/* The bar that fills as replies come in. */}
        <rect x="20" y="112" width="180" height="14" rx="7" className="fill-white/10" />
        <rect x="20" y="112" width="180" height="14" rx="7" className="fill-accent/70 demo-fill" />

        {/* A settling list of guests underneath. */}
        {[0, 1, 2, 3, 4].map((row) => (
          <g key={row}>
            <rect
              x="20"
              y={146 + row * 30}
              width="180"
              height="22"
              rx="8"
              className="fill-white/8"
            />
            <circle cx="36" cy={157 + row * 30} r="5" className="fill-accent/60" />
            <rect
              x="50"
              y={154 + row * 30}
              width={92 - row * 12}
              height="5"
              rx="2.5"
              className="fill-white/30"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
