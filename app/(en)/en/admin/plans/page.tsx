import type { Metadata } from 'next';

import { AdminPlansPage } from '@/features/admin/AdminPlansPage';

export const metadata: Metadata = {
  title: 'Plans & payments',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return <AdminPlansPage locale="en" />;
}
