import { buildGuideMetadata, GuidePage } from '@/features/guide/GuidePage';

export const metadata = buildGuideMetadata('en', '/wedding-rsvp');

export default function Page() {
  return <GuidePage locale="en" path="/wedding-rsvp" />;
}
