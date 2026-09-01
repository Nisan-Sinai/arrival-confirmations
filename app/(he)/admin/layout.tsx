import type { ReactNode } from 'react';

import { requirePlatformOwner } from '@/app/_lib/platformAdmin';
import { signOutAction } from '@/app/actions/auth';
import { ConsoleHeader } from '@/features/layout/ConsoleHeader';

/**
 * The platform-owner area.
 *
 * `requirePlatformOwner` is what guards it; the header is the same one the customer
 * area renders. It used to be a second, separate bar — a different title, a different
 * height, and on a phone two stacked rows against the dashboard's one — so following a
 * tab out of here visibly moved the page. `isPlatformOwner` is hard-coded true because
 * reaching this layout at all means the guard above has already established it.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const owner = await requirePlatformOwner();

  return (
    <>
      <ConsoleHeader email={owner.email ?? null} isPlatformOwner signOut={signOutAction} />
      {children}
    </>
  );
}
