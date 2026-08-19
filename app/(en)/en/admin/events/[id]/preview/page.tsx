import type { Metadata } from 'next';

import { AdminEventPreviewPage } from '@/features/admin/AdminEventPreviewPage';

export const metadata: Metadata = {
  title: 'Event preview',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AdminEventPreviewPage params={params} locale="en" />;
}
