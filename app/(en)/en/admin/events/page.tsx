import type { Metadata } from 'next';

import { AdminEventsPage } from '@/features/admin/AdminEventsPage';

export const metadata: Metadata = {
  title: 'Customer events',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return <AdminEventsPage locale="en" />;
}
