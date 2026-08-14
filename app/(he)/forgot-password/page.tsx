import type { Metadata } from 'next';

import { requestPasswordResetAction } from '@/app/actions/auth';
import { getDictionary } from '@/config/dictionary';
import { SimpleAuthPageBody } from '@/features/auth/SimpleAuthPageBody';

export const metadata: Metadata = {
  title: getDictionary('he').auth.modes.requestReset.title,
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <SimpleAuthPageBody locale="he" mode="requestReset" action={requestPasswordResetAction} />;
}
