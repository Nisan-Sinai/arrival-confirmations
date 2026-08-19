import type { ReactNode } from 'react';

import { AdminShell } from '@/features/admin/AdminShell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell locale="en">{children}</AdminShell>;
}
