import type { Metadata } from 'next';

import { getAppCopy } from '@/config/appCopy';
import { PersonalInvitePage } from '@/features/invite/PersonalInvitePage';

export const metadata: Metadata = {
  title: getAppCopy('en').publicEvent.personalTitle,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return <PersonalInvitePage locale="en" />;
}
