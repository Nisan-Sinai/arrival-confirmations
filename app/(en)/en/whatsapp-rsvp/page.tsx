import { buildGuideMetadata, GuidePage } from '@/features/guide/GuidePage';

export const metadata = buildGuideMetadata('en', '/whatsapp-rsvp');

export default function Page() {
  return <GuidePage locale="en" path="/whatsapp-rsvp" />;
}
