import type { Metadata } from 'next';

import { requestPasswordResetAction } from '@/app/actions/auth';
import { AuthForm } from '@/features/auth/AuthForm';

export const metadata: Metadata = {
  title: 'שחזור סיסמה',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main id="main" className="flex flex-1 items-center justify-center px-4 py-16">
      <AuthForm
        action={requestPasswordResetAction}
        title="שחזור סיסמה"
        submitLabel="שליחת קישור איפוס"
        pendingLabel="שולח…"
        footerPrompt="נזכרתם?"
        footerHref="/login"
        footerLinkLabel="חזרה לכניסה"
        emailOnly
      />
    </main>
  );
}
