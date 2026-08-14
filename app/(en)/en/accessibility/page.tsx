import {
  AccessibilityPageBody,
  buildAccessibilityMetadata,
} from '@/features/legal/AccessibilityPageBody';

export const metadata = buildAccessibilityMetadata('en');

export default function EnglishAccessibilityPage() {
  return <AccessibilityPageBody locale="en" />;
}
