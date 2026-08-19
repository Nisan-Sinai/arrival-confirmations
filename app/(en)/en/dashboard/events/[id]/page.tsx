import type { Metadata } from 'next';

import { getAppCopy } from '@/config/appCopy';
import { EventRsvpsPage } from '@/features/admin/EventRsvpsPage';

export const metadata: Metadata = {
  title: getAppCopy('en').eventPage.metadata,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <EventRsvpsPage params={params} locale="en" />;
}
