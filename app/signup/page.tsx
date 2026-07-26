import type { Metadata } from 'next';

import { signUpAction } from '@/app/actions/auth';
import { AuthForm } from '@/features/auth/AuthForm';

export const metadata: Metadata = {
  title: 'יצירת חשבון',
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <main id="main" className="flex flex-1 items-center justify-center px-4 py-16">
      <AuthForm
        action={signUpAction}
        title="יצירת חשבון"
        submitLabel="יצירת חשבון"
        pendingLabel="יוצר…"
        footerPrompt="כבר יש לכם חשבון?"
        footerHref="/login"
        footerLinkLabel="כניסה"
        isRegistration
      />
    </main>
  );
}
