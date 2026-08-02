import { describe, expect, it } from 'vitest';

import {
  MONETIZATION_LAUNCH_AT,
  PLAN_CATALOG,
  PLAN_CODES,
  formatPlanPrice,
  getPlanDefinition,
  getPlanLabel,
  isMonetizedEvent,
  type PlanCode,
} from '@/app/_lib/plans';

describe('event plans', () => {
  it('keeps the trial and paid plan codes stable', () => {
    expect([...PLAN_CODES]).toEqual(['trial', 'basic', 'premium', 'pro', 'legacy']);
  });

  it('charges 99, 199 and 349 shekels once per event', () => {
    expect(getPlanDefinition('basic')?.priceAgorot).toBe(9_900);
    expect(getPlanDefinition('premium')?.priceAgorot).toBe(19_900);
    expect(getPlanDefinition('pro')?.priceAgorot).toBe(34_900);
    expect(formatPlanPrice(9_900)).toContain('99');
    expect(formatPlanPrice(19_900)).toContain('199');
    expect(formatPlanPrice(34_900)).toContain('349');
  });

  it('limits trial events to ten responses', () => {
    expect(getPlanDefinition('trial')?.attendeeLimit).toBe(10);
  });

  it('gives Pro the highest event capacity', () => {
    expect(getPlanDefinition('pro')?.attendeeLimit).toBe(2_500);
    expect(getPlanDefinition('pro')?.attendeeLimit).toBeGreaterThan(
      getPlanDefinition('premium')?.attendeeLimit ?? 0,
    );
  });

  it('handles legacy and unknown plan definitions safely', () => {
    expect(getPlanDefinition('legacy')).toBeNull();
    expect(getPlanDefinition('unknown' as PlanCode)).toBeNull();
  });

  it('returns readable labels for active, legacy and unexpected values', () => {
    expect(getPlanLabel('basic')).toBe('Basic');
    expect(getPlanLabel('pro')).toBe('Pro');
    expect(getPlanLabel('legacy')).toBe('אירוע קיים — ללא חיוב');
    expect(getPlanLabel('unknown' as PlanCode)).toBe('לא ידוע');
  });

  it('grandfathers events created before monetization', () => {
    expect(isMonetizedEvent('2026-07-31T10:40:59.999Z')).toBe(false);
    expect(isMonetizedEvent(MONETIZATION_LAUNCH_AT)).toBe(true);
  });

  it('publishes every completed Premium capability without coming-soon copy', () => {
    const premium = PLAN_CATALOG.find((plan) => plan.code === 'premium');
    expect(premium?.features.some((feature) => feature.includes('בקרוב'))).toBe(false);
    expect(premium?.features).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Excel'),
        expect.stringContaining('WhatsApp'),
        expect.stringContaining('מיתוג'),
        expect.stringContaining('שולחנות'),
      ]),
    );
  });

  it('describes Premium WhatsApp as personal, free and API-free', () => {
    const premium = PLAN_CATALOG.find((plan) => plan.code === 'premium');
    const features = premium?.features.join(' ') ?? '';
    expect(features).toContain('WhatsApp האישי');
    expect(features).toContain('ללא עלות הודעות');
    expect(features).toContain('ללא צורך בחשבון WhatsApp Business');
    expect(features).not.toContain('WhatsApp אוטומטי');
    expect(features).not.toContain('שליחה אוטומטית');
  });

  it('keeps every Pro feature inside the existing stack with no usage billing', () => {
    const pro = PLAN_CATALOG.find((plan) => plan.code === 'pro');
    const features = pro?.features.join(' ') ?? '';
    expect(features).toContain('הושבה חכמה');
    expect(features).toContain('נגישות');
    expect(features).toContain('נקודות שחזור');
    expect(features).toContain('ללא API חיצוני');
    expect(features).toContain('ללא תשלום לפי פעולה');
    expect(features).not.toContain('SMS');
    expect(features).not.toContain('AI בתשלום');
  });
});
