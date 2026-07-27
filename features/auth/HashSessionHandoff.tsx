'use client';

import { useEffect, useState } from 'react';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/feedback';
import { createClientSideClient } from '@/lib/supabase.browser';

/**
 * Completes an implicit-flow auth link.
 *
 * This is the bug that made password recovery fail in production, and it was in the
 * handler rather than in the mail. The Supabase project issues recovery links in the
 * *implicit* flow, so `/auth/v1/verify` redirects to:
 *
 *     /auth/callback#access_token=…&refresh_token=…&type=recovery
 *
 * A fragment is never transmitted to the server. The callback saw no `code` and no
 * `token_hash`, concluded the link was invalid, and sent the host to /login — for a
 * link that was perfectly good. Only the browser can read this, so only the browser
 * can finish it.
 *
 * `setSession` writes the pair through `createBrowserClient`, which stores it in the
 * cookies `@supabase/ssr` reads on the server. The final navigation is a full document
 * load rather than a router push, so the server re-renders with those cookies present;
 * a client-side transition would arrive at /reset-password before the server knew a
 * session existed, and the page would render its expired-link state.
 */
export function HashSessionHandoff({ next }: { next: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Deferred off the effect body: setState synchronously there triggers a second
    // render before paint, which is what react-hooks/set-state-in-effect objects to.
    const frame = requestAnimationFrame(() => {
      void (async () => {
        const fragment = window.location.hash.replace(/^#/, '');
        const params = new URLSearchParams(fragment);

        // Supabase reports an expired or spent link here too, not as a query param.
        if (params.get('error') !== null) {
          const code = params.get('error_code');
          window.location.replace(`/login?error=${code === 'otp_expired' ? 'expired' : 'auth'}`);
          return;
        }

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken === null || refreshToken === null) {
          window.location.replace('/login?error=auth');
          return;
        }

        const supabase = createClientSideClient();
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setFailed(true);
          window.location.replace('/login?error=expired');
          return;
        }

        // Strip the tokens from the address bar before navigating on, so they do not
        // sit in history for the next person to use this device.
        window.history.replaceState(null, '', window.location.pathname);
        window.location.replace(next);
      })();
    });

    return () => cancelAnimationFrame(frame);
  }, [next]);

  return (
    <Card
      padding="lg"
      className="mx-auto w-full max-w-md text-center"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{failed ? 'האימות נכשל' : 'מאמת את הקישור…'}</span>
      <p className="text-h3 text-primary font-semibold" aria-hidden="true">
        רגע אחד…
      </p>
      <p className="text-muted-foreground mt-2 text-sm" aria-hidden="true">
        מאמתים את הקישור
      </p>
      <div className="mt-7 space-y-3">
        <Skeleton className="mx-auto h-4 w-3/4" />
        <Skeleton className="mx-auto h-4 w-1/2" />
      </div>
      {/* Without JavaScript the fragment can never be read, so say so rather than
          spinning forever. */}
      <noscript>
        <p className="text-destructive mt-6 text-sm">
          השלמת הקישור דורשת JavaScript. הפעילו אותו בדפדפן ופתחו את הקישור שוב.
        </p>
      </noscript>
    </Card>
  );
}
