import { buildLandingMetadata, LandingPage } from '@/features/landing/LandingPage';

export const metadata = buildLandingMetadata('he');

export default function HomePage() {
  return <LandingPage locale="he" />;
}
