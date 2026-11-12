import type { EventType } from '@/config/eventTypes';

/**
 * Which artwork an invitation carries, by the kind of event it announces.
 *
 * The card was drawn for one occasion — a newborn's brit — and its teddy bear, balloons
 * and pair of baby shoes then shipped on every invitation the product produced. A
 * wedding and two bat mitzvahs went out to real guests decorated for a nursery. The
 * artwork is the first thing a guest sees, so getting it wrong says the invitation was
 * not made for this simcha at all.
 *
 *   - `nursery`  the original scene, unchanged, for the four occasions that celebrate a
 *                baby or a small child.
 *   - `festive`  bunting, balloons, a present and confetti — a party, with nothing in it
 *                that belongs to a newborn.
 *   - `wedding`  botanical sprigs and a pair of rings.
 *   - `floral`   the sprigs alone, for a henna or an occasion the list does not name,
 *                where rings would be a guess about someone else's event.
 */
export type OrnamentTheme = 'nursery' | 'festive' | 'wedding' | 'floral';

const THEME_BY_EVENT_TYPE: Readonly<Record<EventType, OrnamentTheme>> = {
  brit_mila: 'nursery',
  britah: 'nursery',
  pidyon_haben: 'nursery',
  upsherin: 'nursery',
  bar_mitzvah: 'festive',
  bat_mitzvah: 'festive',
  birthday: 'festive',
  engagement: 'wedding',
  wedding: 'wedding',
  henna: 'floral',
  other: 'floral',
};

/**
 * An unknown or missing type falls back to `floral`, the one scene that is never wrong:
 * leaves and roses suit any celebration, where the nursery default did not.
 */
export function ornamentThemeFor(eventType: string | null | undefined): OrnamentTheme {
  return THEME_BY_EVENT_TYPE[eventType as EventType] ?? 'floral';
}
