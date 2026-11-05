import { buildGuideMetadata, GuidePage } from '@/features/guide/GuidePage';

export const metadata = buildGuideMetadata('he', '/bar-bat-mitzvah-rsvp');

export default function Page() {
  return <GuidePage locale="he" path="/bar-bat-mitzvah-rsvp" />;
}
