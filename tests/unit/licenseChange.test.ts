import { describe, expect, it } from 'vitest';

import { normalizeLicenseChange } from '@/app/_lib/licenseChange';

describe('normalizeLicenseChange', () => {
  it('forces the trial plan to trial status and zero price', () => {
    expect(
      normalizeLicenseChange({
        plan: 'trial',
        submittedStatus: 'active',
        submittedPrice: '349',
        previousPlan: 'pro',
        previousPriceAgorot: 34_900,
      }),
    ).toEqual({ status: 'trial', priceAgorot: 0 });
  });

  it('activates a paid plan when the previous trial status was left unchanged', () => {
    expect(
      normalizeLicenseChange({
        plan: 'pro',
        submittedStatus: 'trial',
        submittedPrice: '0',
        previousPlan: 'trial',
        previousPriceAgorot: 0,
      }),
    ).toEqual({ status: 'active', priceAgorot: 34_900 });
  });

  it.each(['active', 'pending_payment', 'cancelled', 'refunded'] as const)(
    'keeps an explicit paid-plan status of %s',
    (submittedStatus) => {
      expect(
        normalizeLicenseChange({
          plan: 'premium',
          submittedStatus,
          submittedPrice: '199',
          previousPlan: 'premium',
          previousPriceAgorot: 19_900,
        }).status,
      ).toBe(submittedStatus);
    },
  );

  it('uses the new catalog price when the plan changes and the old price was untouched', () => {
    expect(
      normalizeLicenseChange({
        plan: 'premium',
        submittedStatus: 'active',
        submittedPrice: '99',
        previousPlan: 'basic',
        previousPriceAgorot: 9_900,
      }).priceAgorot,
    ).toBe(19_900);
  });

  it('keeps a price that the administrator explicitly changed', () => {
    expect(
      normalizeLicenseChange({
        plan: 'premium',
        submittedStatus: 'active',
        submittedPrice: '150.5',
        previousPlan: 'basic',
        previousPriceAgorot: 9_900,
      }).priceAgorot,
    ).toBe(15_050);
  });

  it('keeps a custom price when the plan itself did not change', () => {
    expect(
      normalizeLicenseChange({
        plan: 'pro',
        submittedStatus: 'active',
        submittedPrice: '300',
        previousPlan: 'pro',
        previousPriceAgorot: 34_900,
      }).priceAgorot,
    ).toBe(30_000);
  });

  it.each([null, '', 'not-a-number', '-1', '10001'])(
    'falls back to the catalog price for an invalid submitted price: %s',
    (submittedPrice) => {
      expect(
        normalizeLicenseChange({
          plan: 'basic',
          submittedStatus: 'active',
          submittedPrice,
          previousPlan: null,
          previousPriceAgorot: null,
        }).priceAgorot,
      ).toBe(9_900);
    },
  );
});
