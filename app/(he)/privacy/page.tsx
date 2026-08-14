import { buildPrivacyMetadata, PrivacyPageBody } from '@/features/legal/PrivacyPageBody';

export const metadata = buildPrivacyMetadata('he');

export default function PrivacyPage() {
  return <PrivacyPageBody locale="he" />;
}
