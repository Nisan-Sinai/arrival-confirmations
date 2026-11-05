import { buildGuideMetadata, GuidePage } from '@/features/guide/GuidePage';

export const metadata = buildGuideMetadata('en', '/bar-bat-mitzvah-rsvp');

export default function Page() {
  return <GuidePage locale="en" path="/bar-bat-mitzvah-rsvp" />;
}
