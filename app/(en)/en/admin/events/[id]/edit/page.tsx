import type { Metadata } from 'next';

import { AdminEventEditPage } from '@/features/admin/AdminEventEditPage';

export const metadata: Metadata = {
  title: 'Edit customer event',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AdminEventEditPage params={params} locale="en" />;
}
