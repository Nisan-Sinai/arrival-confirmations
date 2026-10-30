import { buildGuideMetadata, GuidePage } from '@/features/guide/GuidePage';

export const metadata = buildGuideMetadata('en');

export default function Page() {
  return <GuidePage locale="en" />;
}
