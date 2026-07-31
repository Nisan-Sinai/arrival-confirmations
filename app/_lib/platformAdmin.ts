import 'server-only';

import { redirect } from 'next/navigation';

import { createUserClient } from '@/lib/server/supabase';

export const PLATFORM_OWNER_EMAIL = 'nisan.sinai5@gmail.com' as const;

export async function getPlatformOwner() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    user === null ||
    user.email?.toLowerCase() !== PLATFORM_OWNER_EMAIL ||
    user.email_confirmed_at === undefined
  ) {
    return null;
  }

  return user;
}

export async function requirePlatformOwner() {
  const user = await getPlatformOwner();
  if (user === null) redirect('/dashboard');
  return user;
}

export async function assertPlatformOwner() {
  const user = await getPlatformOwner();
  if (user === null) throw new Error('Unauthorized platform administration attempt');
  return user;
}
