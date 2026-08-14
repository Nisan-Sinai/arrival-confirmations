import { buildPrivacyMetadata, PrivacyPageBody } from '@/features/legal/PrivacyPageBody';

export const metadata = buildPrivacyMetadata('en');

export default function EnglishPrivacyPage() {
  return <PrivacyPageBody locale="en" />;
}
