import type { ReactNode } from 'react';

import { DashboardShell } from '@/features/admin/DashboardShell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell locale="he">{children}</DashboardShell>;
}
