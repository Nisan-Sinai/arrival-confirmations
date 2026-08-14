import { buildPricingMetadata, PricingPageBody } from '@/features/pricing/PricingPageBody';

export const metadata = buildPricingMetadata('en');

export default function EnglishPricingPage() {
  return <PricingPageBody locale="en" />;
}
