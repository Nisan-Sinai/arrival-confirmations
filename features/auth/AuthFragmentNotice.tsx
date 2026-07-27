'use client';

import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/feedback';

/**
 * Surfaces an auth failure that Supabase reports in the URL fragment.
 *
 * When a recovery link is expired or already spent, Supabase does not redirect to the
 * callback with a query string — it redirects to the configured Site URL with
 * `#error=access_denied&error_code=otp_expired&error_description=…`. A fragment is
 * never sent to the server, so no Server Component can see it and the host lands on an
 * ordinary page with no indication that anything went wrong. They then click the same
 * dead link again.
 *
 * This is the only reason it is a Client Component. It reads the fragment once, states
 * the problem in Hebrew rather than passing through Supabase's English, and clears the
 * hash so a refresh does not re-announce a message the user has already dealt with.
 */

const MESSAGES: Record<string, string> = {
  otp_expired:
    'הקישור פג תוקף או שכבר נעשה בו שימוש. קישורי איפוס תקפים לזמן מוגבל ולפעם אחת בלבד.',
  access_denied: 'הבקשה נדחתה. אם ביקשתם איפוס סיסמה, בקשו קישור חדש.',
};

export function AuthFragmentNotice() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    /**
     * Read on the next frame rather than in the effect body.
     *
     * Setting state synchronously inside an effect schedules a second render before
     * the browser paints, which is what `react-hooks/set-state-in-effect` objects to.
     * The same deferral is used by `features/invite/Countdown.tsx`, and the delay is
     * invisible: this message accompanies a page the user has just landed on.
     */
    const read = () => {
      // `location.hash` exists only in the browser, and only after mount.
      const hash = window.location.hash.replace(/^#/, '');
      if (hash === '') return;

      const params = new URLSearchParams(hash);
      const error = params.get('error');
      if (error === null) return;

      const code = params.get('error_code') ?? '';
      setMessage(MESSAGES[code] ?? MESSAGES[error] ?? 'אירעה תקלה באימות. נסו שוב.');

      // Drop the fragment without adding a history entry, so Back still goes back to
      // wherever the user actually came from.
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    };

    const frame = requestAnimationFrame(read);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (message === null) return null;

  return (
    <Alert tone="error" className="mx-auto w-full max-w-md">
      {message}{' '}
      <a href="/forgot-password" className="font-semibold underline underline-offset-2">
        בקשת קישור חדש
      </a>
    </Alert>
  );
}
