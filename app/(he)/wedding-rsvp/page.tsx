import { buildGuideMetadata, GuidePage } from '@/features/guide/GuidePage';

export const metadata = buildGuideMetadata('he', '/wedding-rsvp');

export default function Page() {
  return <GuidePage locale="he" path="/wedding-rsvp" />;
}
