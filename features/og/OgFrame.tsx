/**
 * The stationery frame both share images are drawn inside (§12).
 *
 * This is not a React DOM component and cannot be reused as one. It is rendered by
 * Satori, which supports a deliberately small slice of CSS: flexbox only, no cascade,
 * no class names, and no `oklch()`. The palette below is therefore the burgundy-and-
 * gold token set from `app/globals.css` converted to sRGB hex — the same colours, in
 * the only notation this renderer understands. If a token there moves, these move
 * with it by hand; there is no build step that can do it for us.
 *
 * The design goal is one thing: in a WhatsApp thread, which is a light surface, the
 * card has to read as a printed invitation at thumbnail size. That argues for a dark
 * burgundy field rather than the ivory paper the site itself uses — ivory on white
 * disappears — with the double gold rule carried over so the preview and the page a
 * guest lands on are recognisably the same object.
 */

export const OG_PALETTE = {
  /** `--primary`, oklch(0.33 0.095 16). */
  wine: '#5c1b24',
  /** `--primary-hover`, the deeper end of the field gradient. */
  wineDeep: '#4e0a18',
  /** `--background`, warm ivory — the ink of this card. */
  ivory: '#fdf8f4',
  /** `--accent`, the decorative gold. */
  gold: '#dbb06b',
  /** `--accent-soft`, for secondary lines that must not compete with the name. */
  goldSoft: '#efdcb9',
} as const;

/** A gold rule with the same four-point star the invitation card uses as a separator. */
export function OgFlourish() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <div
        style={{
          display: 'flex',
          width: 150,
          height: 1,
          backgroundImage: `linear-gradient(to right, rgba(219,176,107,0), ${OG_PALETTE.gold})`,
        }}
      />
      <svg width="18" height="18" viewBox="0 0 24 24" fill={OG_PALETTE.gold}>
        <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" />
      </svg>
      <div
        style={{
          display: 'flex',
          width: 150,
          height: 1,
          backgroundImage: `linear-gradient(to left, rgba(219,176,107,0), ${OG_PALETTE.gold})`,
        }}
      />
    </div>
  );
}

export function OgFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        padding: 26,
        backgroundColor: OG_PALETTE.wine,
        backgroundImage: `radial-gradient(circle at 50% 0%, ${OG_PALETTE.wine}, ${OG_PALETTE.wineDeep})`,
        fontFamily: 'Assistant',
      }}
    >
      {/* The double rule: an outer gold hairline and an inner one inset from it. Two
          elements rather than one bordered element with an outline, because Satori
          implements `border` and ignores `outline`. */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          border: `2px solid rgba(219,176,107,0.55)`,
          borderRadius: 10,
          padding: 7,
        }}
      >
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid rgba(219,176,107,0.3)`,
            borderRadius: 5,
            padding: '34px 60px',
            textAlign: 'center',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
