import type { Metadata } from 'next';

import { requestPasswordResetAction } from '@/app/actions/auth';
import { AuthForm } from '@/features/auth/AuthForm';
import { SiteHeader } from '@/features/layout/SiteHeader';

export const metadata: Metadata = {
  title: 'שחזור סיסמה',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader minimal />
      <main
        id="main"
        className="from-secondary/30 flex flex-1 items-center justify-center bg-gradient-to-b to-transparent px-5 py-16 sm:py-24"
      >
        <AuthForm
          action={requestPasswordResetAction}
          mode="requestReset"
          title="שחזור סיסמה"
          subtitle="הזינו את כתובת האימייל של החשבון ונשלח אליה קישור לבחירת סיסמה חדשה."
          submitLabel="שליחת קישור איפוס"
          pendingLabel="שולח…"
          footerPrompt="נזכרתם?"
          footerHref="/login"
          footerLinkLabel="חזרה לכניסה"
        />
      </main>
    </>
  );
}
