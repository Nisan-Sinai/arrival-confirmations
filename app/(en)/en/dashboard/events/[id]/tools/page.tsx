import type { Metadata } from 'next';

import { getAppCopy } from '@/config/appCopy';
import { EventToolsPage } from '@/features/admin/EventToolsPage';

export const metadata: Metadata = {
  title: getAppCopy('en').toolsPage.metadata,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <EventToolsPage params={params} locale="en" />;
}
