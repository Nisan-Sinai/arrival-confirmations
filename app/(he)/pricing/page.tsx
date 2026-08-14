import { buildPricingMetadata, PricingPageBody } from '@/features/pricing/PricingPageBody';

export const metadata = buildPricingMetadata('he');

export default function PricingPage() {
  return <PricingPageBody locale="he" />;
}
