import type { Metadata } from 'next';

import { signUpAction } from '@/app/actions/auth';
import { AuthForm } from '@/features/auth/AuthForm';

export const metadata: Metadata = {
  title: 'יצירת חשבון',
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <main
      id="main"
      className="from-secondary/30 flex flex-1 items-center justify-center bg-gradient-to-b to-transparent px-5 py-16 sm:py-24"
    >
      <AuthForm
        action={signUpAction}
        mode="signUp"
        title="יצירת חשבון"
        subtitle="חינם, בלי כרטיס אשראי ובלי הגבלה על מספר האורחים."
        submitLabel="יצירת חשבון"
        pendingLabel="יוצר…"
        footerPrompt="כבר יש לכם חשבון?"
        footerHref="/login"
        footerLinkLabel="כניסה"
      />
    </main>
  );
}
