import type { Metadata } from 'next';

import { getDictionary } from '@/config/dictionary';
import { ResetPasswordPageBody } from '@/features/auth/ResetPasswordPageBody';

export const metadata: Metadata = {
  title: getDictionary('he').auth.modes.setPassword.title,
  robots: { index: false, follow: false },
};

// The recovery session lives in a cookie set moments ago; nothing here may be cached.
export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  return <ResetPasswordPageBody locale="he" />;
}
