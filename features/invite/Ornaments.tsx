/**
 * Decorative artwork for the invitation (§5).
 *
 * Every piece here is inline SVG rather than an image file. That is not purism:
 *
 *   - An invitation is opened on cellular data, once, often on an old phone. Vector
 *     ornament costs a few hundred bytes inside the HTML that is already arriving,
 *     where a watercolour PNG set costs half a megabyte and a second request wave.
 *   - Nothing reflows when it loads, because there is no load. §12 rules out layout
 *     shift and this removes the possibility rather than mitigating it.
 *   - §4.2 forbids third-party requests on any page that can carry an invitation
 *     URL. Self-contained artwork means there is nothing to forbid.
 *   - It stays sharp at any pixel density and recolours with the theme.
 *
 * Everything is `aria-hidden`: a screen reader announcing "teddy bear illustration"
 * between the date and the venue would be noise, not information (§9).
 */

/** The palette, kept here so the whole scene recolours from one place. */
const BLUE_DEEP = '#5e1b28';
const BLUE_SOFT = '#dcaeb5';
const BLUE_PALE = '#f6e3e5';
const GOLD = '#c9a227';
const GOLD_PALE = '#e8d9a0';
const CREAM = '#faf7ef';

/**
 * Soft watercolour washes behind the card.
 *
 * Large blurred ellipses rather than a texture image — at this opacity the eye reads
 * the diffusion, not the shape.
 */
export function WatercolourWash() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      viewBox="0 0 400 560"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="wash-a">
          <stop offset="0%" stopColor={BLUE_SOFT} stopOpacity="0.45" />
          <stop offset="100%" stopColor={BLUE_SOFT} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wash-b">
          <stop offset="0%" stopColor={GOLD_PALE} stopOpacity="0.35" />
          <stop offset="100%" stopColor={GOLD_PALE} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="70" rx="150" ry="120" fill="url(#wash-a)" />
      <ellipse cx="350" cy="180" rx="130" ry="110" fill="url(#wash-b)" />
      <ellipse cx="330" cy="500" rx="150" ry="120" fill="url(#wash-a)" />
      <ellipse cx="50" cy="430" rx="120" ry="100" fill="url(#wash-b)" />
    </svg>
  );
}

/** A gold filigree corner. Rotated by the caller to serve all four corners. */
export function CornerFiligree({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 90" className={className} aria-hidden="true" fill="none">
      <path
        d="M4 34c0-18 12-30 30-30M10 30c0-12 8-20 20-20"
        stroke={GOLD}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M14 44c6-2 9-7 8-13-1-5-6-7-9-4-3 2-2 7 2 8 6 2 12-2 15-8"
        stroke={GOLD}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M44 14c-2 6-7 9-13 8-5-1-7-6-4-9 2-3 7-2 8 2 2 6-2 12-8 15"
        stroke={GOLD}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <circle cx="34" cy="34" r="2.2" fill={GOLD} />
    </svg>
  );
}

/** Bunting strung across the top, as on the printed card. */
export function Bunting({ className = '' }: { className?: string }) {
  const flags = [
    { x: 0, fill: BLUE_SOFT, dots: false },
    { x: 34, fill: CREAM, dots: true },
    { x: 68, fill: BLUE_PALE, dots: false },
    { x: 102, fill: BLUE_SOFT, dots: true },
    { x: 136, fill: CREAM, dots: false },
    { x: 170, fill: BLUE_PALE, dots: true },
  ];
  return (
    <svg viewBox="0 0 210 60" className={className} aria-hidden="true" fill="none">
      {/* The string sags between its anchors, which is what makes it read as cloth. */}
      <path d="M2 8C60 26 150 26 208 6" stroke={GOLD} strokeWidth="1.4" strokeLinecap="round" />
      {flags.map((flag) => {
        // Follow the curve so each flag hangs from the string rather than floating.
        const t = flag.x / 210;
        const y = 8 + 18 * Math.sin(Math.PI * t);
        return (
          <g key={flag.x} transform={`translate(${flag.x + 6} ${y})`}>
            <path d="M0 0h26l-13 26z" fill={flag.fill} stroke={GOLD} strokeWidth="0.8" />
            {flag.dots && (
              <>
                <circle cx="9" cy="7" r="1.5" fill={GOLD} opacity="0.7" />
                <circle cx="17" cy="7" r="1.5" fill={GOLD} opacity="0.7" />
                <circle cx="13" cy="14" r="1.5" fill={GOLD} opacity="0.7" />
              </>
            )}
          </g>
        );
      })}
      <path d="M20 2l1.5 4 4 1.5-4 1.5L20 13l-1.5-4-4-1.5 4-1.5z" fill={GOLD} opacity="0.8" />
      <path
        d="M188 4l1.2 3.2 3.2 1.2-3.2 1.2-1.2 3.2-1.2-3.2-3.2-1.2 3.2-1.2z"
        fill={GOLD}
        opacity="0.8"
      />
    </svg>
  );
}

/** A cluster of three balloons with ribbon and bow. */
export function Balloons({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 190" className={className} aria-hidden="true" fill="none">
      <defs>
        {/* An off-centre highlight is what makes a flat ellipse read as inflated. */}
        <radialGradient id="balloon-solid" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="45%" stopColor={BLUE_SOFT} />
          <stop offset="100%" stopColor="#c98d97" />
        </radialGradient>
        <radialGradient id="balloon-clear" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="60%" stopColor={CREAM} />
          <stop offset="100%" stopColor={BLUE_PALE} />
        </radialGradient>
      </defs>

      <path
        d="M40 62c4 40 10 60 18 100M62 58c-2 44-6 66-4 104M84 66c-6 38-14 58-18 96"
        stroke={GOLD}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.75"
      />

      <ellipse cx="40" cy="38" rx="27" ry="32" fill="url(#balloon-solid)" />
      <path d="M40 70l-4 6h8z" fill="#c98d97" />

      <ellipse
        cx="84"
        cy="44"
        rx="24"
        ry="29"
        fill="url(#balloon-clear)"
        stroke={GOLD_PALE}
        strokeWidth="0.8"
      />
      <path d="M84 73l-3.5 6h7z" fill={BLUE_PALE} />
      <circle cx="78" cy="36" r="1.6" fill={GOLD} opacity="0.6" />
      <circle cx="90" cy="46" r="1.6" fill={GOLD} opacity="0.6" />
      <circle cx="82" cy="56" r="1.6" fill={GOLD} opacity="0.6" />

      <ellipse
        cx="60"
        cy="30"
        rx="22"
        ry="26"
        fill="url(#balloon-clear)"
        stroke={GOLD_PALE}
        strokeWidth="0.8"
      />
      <path d="M60 56l-3 5h6z" fill={BLUE_PALE} />
      <circle cx="55" cy="24" r="1.4" fill={GOLD} opacity="0.55" />
      <circle cx="66" cy="34" r="1.4" fill={GOLD} opacity="0.55" />

      {/* The bow gathers the three ribbons, so the cluster reads as one object. */}
      <path
        d="M62 162c-8-8-18-6-16 2 2 7 12 6 16-2zM62 162c8-8 18-6 16 2-2 7-12 6-16-2z"
        fill={BLUE_SOFT}
        stroke={GOLD}
        strokeWidth="0.8"
      />
      <circle cx="62" cy="163" r="3.5" fill={BLUE_PALE} stroke={GOLD} strokeWidth="0.8" />
      <path
        d="M58 168c-3 8-4 14-3 20M66 168c3 8 4 14 3 20"
        stroke={BLUE_SOFT}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The teddy bear from the printed card. */
export function TeddyBear({ className = '' }: { className?: string }) {
  const FUR = '#d9c3a5';
  const FUR_DARK = '#c2a882';
  const SNOUT = '#efe3d0';
  return (
    <svg viewBox="0 0 130 130" className={className} aria-hidden="true" fill="none">
      <ellipse cx="30" cy="112" rx="17" ry="11" fill={FUR} stroke={FUR_DARK} strokeWidth="1" />
      <ellipse cx="94" cy="112" rx="17" ry="11" fill={FUR} stroke={FUR_DARK} strokeWidth="1" />
      <ellipse
        cx="34"
        cy="80"
        rx="12"
        ry="18"
        fill={FUR}
        stroke={FUR_DARK}
        strokeWidth="1"
        transform="rotate(18 34 80)"
      />
      <ellipse
        cx="90"
        cy="80"
        rx="12"
        ry="18"
        fill={FUR}
        stroke={FUR_DARK}
        strokeWidth="1"
        transform="rotate(-18 90 80)"
      />
      <ellipse cx="62" cy="86" rx="30" ry="30" fill={FUR} stroke={FUR_DARK} strokeWidth="1" />
      <ellipse cx="62" cy="92" rx="18" ry="18" fill={SNOUT} opacity="0.75" />

      <circle cx="34" cy="38" r="13" fill={FUR} stroke={FUR_DARK} strokeWidth="1" />
      <circle cx="34" cy="38" r="6.5" fill={SNOUT} />
      <circle cx="90" cy="38" r="13" fill={FUR} stroke={FUR_DARK} strokeWidth="1" />
      <circle cx="90" cy="38" r="6.5" fill={SNOUT} />

      <circle cx="62" cy="46" r="30" fill={FUR} stroke={FUR_DARK} strokeWidth="1" />
      <ellipse cx="62" cy="57" rx="15" ry="12" fill={SNOUT} />
      <ellipse cx="62" cy="50" rx="5" ry="3.6" fill={BLUE_DEEP} />
      <path
        d="M62 54v4M62 58c-3 3-7 2-8-1M62 58c3 3 7 2 8-1"
        stroke={BLUE_DEEP}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="51" cy="41" r="3" fill={BLUE_DEEP} />
      <circle cx="73" cy="41" r="3" fill={BLUE_DEEP} />
      <circle cx="52.2" cy="39.8" r="1" fill="#fff" />
      <circle cx="74.2" cy="39.8" r="1" fill="#fff" />

      {/* The ribbon ties the bear to the invitation's palette. */}
      <path
        d="M62 74c-9-7-19-4-16 4 2 7 12 5 16-4zM62 74c9-7 19-4 16 4-2 7-12 5-16-4z"
        fill={BLUE_SOFT}
        stroke={GOLD}
        strokeWidth="0.9"
      />
      <circle cx="62" cy="75" r="4" fill={BLUE_PALE} stroke={GOLD} strokeWidth="0.9" />
    </svg>
  );
}

/** A wrapped gift beside a pair of baby shoes. */
export function GiftAndShoes({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 120" className={className} aria-hidden="true" fill="none">
      <rect
        x="12"
        y="40"
        width="62"
        height="52"
        rx="4"
        fill={BLUE_PALE}
        stroke={GOLD}
        strokeWidth="1"
      />
      <path d="M12 56h62" stroke={GOLD} strokeWidth="0.8" opacity="0.5" />
      {[22, 34, 46, 58, 68].map((x) => (
        <circle key={x} cx={x} cy="74" r="2" fill={BLUE_SOFT} />
      ))}
      {[28, 40, 52, 64].map((x) => (
        <circle key={x} cx={x} cy="84" r="2" fill={BLUE_SOFT} />
      ))}
      <rect x="38" y="40" width="10" height="52" fill={BLUE_SOFT} opacity="0.85" />
      <path
        d="M43 40c-11-6-20-2-17 6 2 7 12 5 17-6zM43 40c11-6 20-2 17 6-2 7-12 5-17-6z"
        fill={BLUE_SOFT}
        stroke={GOLD}
        strokeWidth="1"
      />
      <circle cx="43" cy="40" r="4.5" fill={BLUE_PALE} stroke={GOLD} strokeWidth="1" />

      <g>
        <path
          d="M86 84c0-12 6-20 14-20s12 6 12 12v8c0 5-4 8-10 8h-8c-5 0-8-3-8-8z"
          fill={CREAM}
          stroke={BLUE_SOFT}
          strokeWidth="1.2"
        />
        <path
          d="M90 76c4-3 12-3 16 0M90 81c4-3 12-3 16 0"
          stroke={BLUE_SOFT}
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M98 64c-4-4-8-2-7 2 1 3 5 3 7-2zM98 64c4-4 8-2 7 2-1 3-5 3-7-2z"
          fill={BLUE_PALE}
          stroke={BLUE_SOFT}
          strokeWidth="0.8"
        />
      </g>
      <g transform="translate(30 4)">
        <path
          d="M86 84c0-12 6-20 14-20s12 6 12 12v8c0 5-4 8-10 8h-8c-5 0-8-3-8-8z"
          fill={CREAM}
          stroke={BLUE_SOFT}
          strokeWidth="1.2"
        />
        <path
          d="M90 76c4-3 12-3 16 0M90 81c4-3 12-3 16 0"
          stroke={BLUE_SOFT}
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M98 64c-4-4-8-2-7 2 1 3 5 3 7-2zM98 64c4-4 8-2 7 2-1 3-5 3-7-2z"
          fill={BLUE_PALE}
          stroke={BLUE_SOFT}
          strokeWidth="0.8"
        />
      </g>
    </svg>
  );
}

/** A sprig of eucalyptus with two roses. */
export function FloralSprig({ className = '' }: { className?: string }) {
  const LEAF = '#b9cdb4';
  const LEAF_DARK = '#98b394';
  return (
    <svg viewBox="0 0 110 130" className={className} aria-hidden="true" fill="none">
      <path
        d="M20 124C34 96 44 66 46 34"
        stroke={LEAF_DARK}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {[
        [30, 100, -30],
        [40, 84, -25],
        [46, 66, -18],
        [50, 48, -12],
        [50, 30, -6],
      ].map(([x, y, r]) => (
        <ellipse
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          rx="11"
          ry="7"
          fill={LEAF}
          stroke={LEAF_DARK}
          strokeWidth="0.7"
          transform={`rotate(${r} ${x} ${y})`}
        />
      ))}
      {[
        [58, 96, 32],
        [64, 78, 26],
        [66, 58, 18],
      ].map(([x, y, r]) => (
        <ellipse
          key={`b-${x}-${y}`}
          cx={x}
          cy={y}
          rx="10"
          ry="6.5"
          fill={LEAF}
          stroke={LEAF_DARK}
          strokeWidth="0.7"
          transform={`rotate(${r} ${x} ${y})`}
        />
      ))}

      {/* Roses drawn as nested arcs — a spiral reads as petals at this scale. */}
      {[
        { cx: 76, cy: 104, r: 15 },
        { cx: 88, cy: 82, r: 12 },
      ].map(({ cx, cy, r }) => (
        <g key={`rose-${cx}`}>
          <circle cx={cx} cy={cy} r={r} fill={BLUE_PALE} stroke={BLUE_SOFT} strokeWidth="0.9" />
          <path
            d={`M${cx - r * 0.55} ${cy}a${r * 0.55} ${r * 0.55} 0 1 1 ${r * 1.1} 0a${r * 0.38} ${r * 0.38} 0 1 1 -${r * 0.76} 0a${r * 0.2} ${r * 0.2} 0 1 1 ${r * 0.4} 0`}
            stroke={BLUE_SOFT}
            strokeWidth="1"
            fill="none"
          />
        </g>
      ))}
    </svg>
  );
}
