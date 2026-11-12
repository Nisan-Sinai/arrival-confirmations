import { describe, expect, it } from 'vitest';

import { EVENT_TYPES } from '@/config/eventTypes';
import { ornamentThemeFor } from '@/features/invite/ornamentTheme';

/**
 * Which artwork an invitation carries.
 *
 * The regression: every invitation was decorated for a newborn — a teddy bear, balloons
 * and a pair of baby shoes — because the card had been drawn for one brit and the scene
 * was never made conditional. A wedding and two bat mitzvahs were live with it.
 */
describe('ornamentThemeFor', () => {
  it('keeps the nursery scene for the occasions that celebrate a baby or small child', () => {
    for (const type of ['brit_mila', 'britah', 'pidyon_haben', 'upsherin']) {
      expect(ornamentThemeFor(type), type).toBe('nursery');
    }
  });

  it('gives a wedding and an engagement the rings', () => {
    expect(ornamentThemeFor('wedding')).toBe('wedding');
    expect(ornamentThemeFor('engagement')).toBe('wedding');
  });

  it('gives a mitzvah and a birthday a party with nothing of the nursery in it', () => {
    for (const type of ['bar_mitzvah', 'bat_mitzvah', 'birthday']) {
      expect(ornamentThemeFor(type), type).toBe('festive');
    }
  });

  it('uses the sprigs alone where rings would be a guess', () => {
    expect(ornamentThemeFor('henna')).toBe('floral');
    expect(ornamentThemeFor('other')).toBe('floral');
  });

  it('never falls back to the nursery for a type it does not know', () => {
    expect(ornamentThemeFor('graduation')).toBe('floral');
    expect(ornamentThemeFor(null)).toBe('floral');
    expect(ornamentThemeFor(undefined)).toBe('floral');
  });

  it('assigns a theme to every event type the product offers', () => {
    // A type added to the list without a decision here would silently take the fallback.
    const themed = EVENT_TYPES.filter((type) => ornamentThemeFor(type) !== 'floral');
    expect(themed).toHaveLength(EVENT_TYPES.length - 2);
  });
});
