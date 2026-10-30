import { buildGuideMetadata, GuidePage } from '@/features/guide/GuidePage';

export const metadata = buildGuideMetadata('he');

export default function Page() {
  return <GuidePage locale="he" />;
}
