import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { requirePlatformOwner } from '@/app/_lib/platformAdmin';
import { getAppCopy } from '@/config/appCopy';
import { AdminNavigation } from '@/features/admin/AdminNavigation';
import { localePath, type Locale } from '@/lib/i18n';

export async function AdminShell({
  locale,
  children,
}: Readonly<{ locale: Locale; children: ReactNode }>) {
  const access = await requirePlatformOwner();
  if (access.user === null) redirect(localePath(locale, '/login'));
  if (!access.allowed) redirect(localePath(locale, '/dashboard'));

  const product = getAppCopy(locale).dashboardNav.product;
  return (
    <>
      <AdminNavigation locale={locale} productName={product} email={access.user.email ?? ''} />
      {children}
    </>
  );
}
