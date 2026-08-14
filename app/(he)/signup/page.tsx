import type { Metadata } from 'next';

import { signUpAction } from '@/app/actions/auth';
import { getDictionary } from '@/config/dictionary';
import { SimpleAuthPageBody } from '@/features/auth/SimpleAuthPageBody';

export const metadata: Metadata = {
  title: getDictionary('he').auth.modes.signUp.title,
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <SimpleAuthPageBody locale="he" mode="signUp" action={signUpAction} />;
}
