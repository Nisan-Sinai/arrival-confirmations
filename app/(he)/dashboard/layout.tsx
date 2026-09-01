import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { PLATFORM_OWNER_EMAIL } from '@/app/_lib/platformAdmin';
import { signOutAction } from '@/app/actions/auth';
import { ConsoleHeader } from '@/features/layout/ConsoleHeader';
import { createUserClient } from '@/lib/server/supabase';

/**
 * The customer area.
 *
 * The header markup used to live here in full, and a second, unrelated one lived in
 * `admin/layout.tsx`. Both now render `ConsoleHeader`, which is the whole point: the
 * owner moves between these two trees constantly, and two headers meant the bar changed
 * shape under them on every crossing. See the note in that file.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect('/login');

  return (
    <>
      <ConsoleHeader
        email={user.email ?? null}
        isPlatformOwner={user.email?.toLowerCase() === PLATFORM_OWNER_EMAIL}
        signOut={signOutAction}
      />
      {children}
    </>
  );
}
