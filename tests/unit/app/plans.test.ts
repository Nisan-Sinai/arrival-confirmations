import { describe, expect, it } from 'vitest';

import {
  MONETIZATION_LAUNCH_AT,
  PLAN_CATALOG,
  PLAN_CODES,
  formatPlanPrice,
  getPlanDefinition,
  isMonetizedEvent,
} from '@/app/_lib/plans';

describe('event plans', () => {
  it('keeps the trial and paid plan codes stable', () => {
    expect([...PLAN_CODES]).toEqual(['trial', 'basic', 'premium', 'legacy']);
  });

  it('charges 99 and 199 shekels once per event', () => {
    expect(getPlanDefinition('basic')?.priceAgorot).toBe(9_900);
    expect(getPlanDefinition('premium')?.priceAgorot).toBe(19_900);
    expect(formatPlanPrice(9_900)).toContain('99');
    expect(formatPlanPrice(19_900)).toContain('199');
  });

  it('limits trial events to ten responses', () => {
    expect(getPlanDefinition('trial')?.attendeeLimit).toBe(10);
  });

  it('grandfathers events created before monetization', () => {
    expect(isMonetizedEvent('2026-07-31T10:40:59.999Z')).toBe(false);
    expect(isMonetizedEvent(MONETIZATION_LAUNCH_AT)).toBe(true);
  });

  it('labels unfinished Premium integrations honestly', () => {
    const premium = PLAN_CATALOG.find((plan) => plan.code === 'premium');
    expect(premium?.features.filter((feature) => feature.includes('בקרוב'))).toHaveLength(3);
  });
});
