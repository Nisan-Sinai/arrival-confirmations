import type { Metadata } from 'next';

import { getAppCopy } from '@/config/appCopy';
import { GuestsPage, type GuestsPageProps } from '@/features/admin/GuestsPage';

export const metadata: Metadata = {
  title: getAppCopy('he').guestsPage.metadata,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function Page(props: GuestsPageProps) {
  return <GuestsPage {...props} locale="he" />;
}
