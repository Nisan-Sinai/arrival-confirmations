import type { Metadata } from 'next';

import { AdminEventPage, type AdminEventPageProps } from '@/features/admin/AdminEventPage';

export const metadata: Metadata = {
  title: 'Customer event',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function Page(props: AdminEventPageProps) {
  return <AdminEventPage {...props} locale="en" />;
}
