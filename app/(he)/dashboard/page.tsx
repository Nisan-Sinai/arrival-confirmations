import type { Metadata } from 'next';

import { getAppCopy } from '@/config/appCopy';
import { DashboardPage } from '@/features/admin/DashboardPage';

export const metadata: Metadata = {
  title: getAppCopy('he').dashboard.metadataTitle,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return <DashboardPage locale="he" />;
}
