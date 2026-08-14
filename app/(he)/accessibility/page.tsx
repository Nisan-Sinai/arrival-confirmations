import {
  AccessibilityPageBody,
  buildAccessibilityMetadata,
} from '@/features/legal/AccessibilityPageBody';

export const metadata = buildAccessibilityMetadata('he');

export default function AccessibilityPage() {
  return <AccessibilityPageBody locale="he" />;
}
