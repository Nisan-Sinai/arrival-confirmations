import Link from 'next/link';
import type { ReactNode } from 'react';

import { requirePlatformOwner } from '@/app/_lib/platformAdmin';
import { buttonClass } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const owner = await requirePlatformOwner();

  return (
    <>
      <header className="border-border/70 bg-background/90 sticky top-0 z-[--z-header] border-b backdrop-blur-md">
        <Container
          width="wide"
          className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3"
        >
          <div>
            <Link href="/admin/plans" className="text-primary text-lg font-bold">
              ניהול המערכת
            </Link>
            <p className="text-muted-foreground text-xs" dir="ltr">
              {owner.email}
            </p>
          </div>
          <nav aria-label="ניווט ניהול" className="flex items-center gap-2">
            <Link href="/dashboard" className={buttonClass({ variant: 'ghost', size: 'sm' })}>
              האירועים שלי
            </Link>
            <Link href="/admin/plans" className={buttonClass({ variant: 'outline', size: 'sm' })}>
              מסלולים ותשלומים
            </Link>
          </nav>
        </Container>
      </header>
      {children}
    </>
  );
}
