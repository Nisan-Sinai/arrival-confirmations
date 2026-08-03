'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Button, buttonClass } from '@/components/ui/button';
import { Rule } from '@/components/ui/layout';
import { UI_MESSAGES } from '@/config/messages';

/**
 * The route-level error boundary (§13).
 *
 * The error itself is deliberately not rendered. The digest is safe to expose and lets
 * support correlate the screen with the server log without leaking database details.
 */
export default function ErrorBoundary({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled route error', { digest: error.digest });
  }, [error]);

  return (
    <main id="main" className="flex flex-1 items-center justify-center px-5 py-20 sm:py-28">
      <div className="w-full max-w-lg text-center">
        <span
          aria-hidden="true"
          className="border-accent-strong/30 text-accent-strong mx-auto flex size-16 items-center justify-center rounded-full border"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-7"
          >
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
        </span>
        <h1 className="text-h1 text-primary mt-6 font-bold">{UI_MESSAGES.errors.genericTitle}</h1>
        <Rule className="my-7" />
        <p className="text-muted-foreground text-lead leading-relaxed">
          {UI_MESSAGES.errors.genericBody}
        </p>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          טעינה מחדש פותרת גם מצב שבו הדפדפן שמר קובץ ישן אחרי פריסה חדשה.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={() => window.location.reload()}>
            טעינה מחדש
          </Button>
          <Link
            href="/dashboard"
            className={buttonClass({ variant: 'outline', size: 'lg' })}
          >
            חזרה ללוח הבקרה
          </Link>
        </div>
        {error.digest !== undefined && (
          <p className="text-muted-foreground mt-8 text-xs">
            מזהה תקלה: <span dir="ltr">{error.digest}</span>
          </p>
        )}
      </div>
    </main>
  );
}
