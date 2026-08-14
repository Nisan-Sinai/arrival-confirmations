'use client';

import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/feedback';
import { getDictionary } from '@/config/dictionary';
import { defaultLocale, type Locale } from '@/lib/i18n';

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
 * the problem in the reader's own language rather than passing through Supabase's
 * English, and clears the hash so a refresh does not re-announce a message the user has
 * already dealt with.
 */

export function AuthFragmentNotice({ locale = defaultLocale }: { locale?: Locale }) {
  const { authNotice } = getDictionary(locale);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Resolved inside the effect so the only dependency is the locale, not a fresh
    // dictionary object on every render.
    const notice = getDictionary(locale).authNotice;
    const messages: Record<string, string> = {
      otp_expired: notice.otpExpired,
      access_denied: notice.accessDenied,
    };

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
      setMessage(messages[code] ?? messages[error] ?? notice.generic);

      // Drop the fragment without adding a history entry, so Back still goes back to
      // wherever the user actually came from.
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    };

    const frame = requestAnimationFrame(read);
    return () => cancelAnimationFrame(frame);
  }, [locale]);

  if (message === null) return null;

  return (
    <Alert tone="error" className="mx-auto w-full max-w-md">
      {message}{' '}
      <a href="/forgot-password" className="font-semibold underline underline-offset-2">
        {authNotice.requestNewLink}
      </a>
    </Alert>
  );
}
