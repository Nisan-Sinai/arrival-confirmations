import { buildLandingMetadata, LandingPage } from '@/features/landing/LandingPage';

export const metadata = buildLandingMetadata('en');

export default function EnglishHomePage() {
  return <LandingPage locale="en" />;
}
