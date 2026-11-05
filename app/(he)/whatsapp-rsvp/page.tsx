import { buildGuideMetadata, GuidePage } from '@/features/guide/GuidePage';

export const metadata = buildGuideMetadata('he', '/whatsapp-rsvp');

export default function Page() {
  return <GuidePage locale="he" path="/whatsapp-rsvp" />;
}
