import type { Metadata } from 'next';

import { signInAction } from '@/app/actions/auth';
import { AuthForm } from '@/features/auth/AuthForm';

export const metadata: Metadata = {
  title: 'כניסה לחשבון',
  // §12: account pages have no business in a search index.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main id="main" className="flex flex-1 items-center justify-center px-4 py-16">
      <AuthForm
        action={signInAction}
        title="כניסה לחשבון"
        submitLabel="כניסה"
        pendingLabel="נכנס…"
        footerPrompt="אין לכם חשבון?"
        footerHref="/signup"
        footerLinkLabel="הרשמה"
      />
    </main>
  );
}
