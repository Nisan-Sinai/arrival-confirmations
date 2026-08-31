import Link from 'next/link';
import type { ReactNode } from 'react';

import { requirePlatformOwner } from '@/app/_lib/platformAdmin';
import { Container } from '@/components/ui/layout';
import { AdminNavigation } from '@/features/admin/AdminNavigation';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const owner = await requirePlatformOwner();

  return (
    <>
      <header className="border-border/70 bg-background/90 sticky top-0 z-[var(--z-header)] border-b backdrop-blur-md">
        <Container
          width="wide"
          className="flex min-h-16 flex-col items-stretch gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <Link href="/admin/events" className="text-primary text-lg font-bold">
              ניהול המערכת
            </Link>
            <p className="text-muted-foreground truncate text-xs" dir="ltr">
              {owner.email}
            </p>
          </div>
          <AdminNavigation />
        </Container>
      </header>
      {children}
    </>
  );
}
