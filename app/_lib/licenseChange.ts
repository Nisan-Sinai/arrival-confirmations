import { getPlanDefinition, type LicenseStatus, type PlanCode } from '@/app/_lib/plans';

export type EditablePlan = Exclude<PlanCode, 'legacy'>;

interface NormalizeLicenseChangeInput {
  readonly plan: EditablePlan;
  readonly submittedStatus: LicenseStatus;
  readonly submittedPrice: string | null;
  readonly previousPlan: EditablePlan | null;
  readonly previousPriceAgorot: number | null;
}

interface NormalizedLicenseChange {
  readonly status: LicenseStatus;
  readonly priceAgorot: number;
}

const MAX_PRICE_SHEKELS = 10_000;

function normalizedPaidStatus(submittedStatus: LicenseStatus): LicenseStatus {
  return submittedStatus === 'trial' ? 'active' : submittedStatus;
}

function parsedPriceAgorot(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const shekels = Number(value);
  if (!Number.isFinite(shekels) || shekels < 0 || shekels > MAX_PRICE_SHEKELS) return null;
  return Math.round(shekels * 100);
}

export function normalizeLicenseChange(
  input: NormalizeLicenseChangeInput,
): NormalizedLicenseChange {
  if (input.plan === 'trial') {
    return { status: 'trial', priceAgorot: 0 };
  }

  const defaultPriceAgorot = getPlanDefinition(input.plan)!.priceAgorot;
  const submittedPriceAgorot = parsedPriceAgorot(input.submittedPrice);
  const priceWasNotEditedAfterPlanChange =
    input.previousPlan !== null &&
    input.previousPlan !== input.plan &&
    input.previousPriceAgorot !== null &&
    submittedPriceAgorot === input.previousPriceAgorot;

  return {
    status: normalizedPaidStatus(input.submittedStatus),
    priceAgorot:
      submittedPriceAgorot === null || priceWasNotEditedAfterPlanChange
        ? defaultPriceAgorot
        : submittedPriceAgorot,
  };
}
