import type { Metadata } from 'next';

import { requestPasswordResetAction } from '@/app/actions/auth';
import { getDictionary } from '@/config/dictionary';
import { SimpleAuthPageBody } from '@/features/auth/SimpleAuthPageBody';

export const metadata: Metadata = {
  title: getDictionary('en').auth.modes.requestReset.title,
  robots: { index: false, follow: false },
};

export default function EnglishForgotPasswordPage() {
  return <SimpleAuthPageBody locale="en" mode="requestReset" action={requestPasswordResetAction} />;
}
