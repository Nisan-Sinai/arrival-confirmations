'use client';

import { useEffect } from 'react';

import { Button, buttonClass } from '@/components/ui/button';
import { Rule } from '@/components/ui/layout';
import { UI_MESSAGES } from '@/config/messages';
import Link from 'next/link';

/**
 * The route-level error boundary (§13).
 *
 * There was none, so an exception anywhere below the root layout — a Supabase outage
 * mid-render on the invitation page, say — fell through to Next.js's built-in screen.
 *
 * What is deliberately *not* here: `error.message`. In production Next.js already
 * replaces it with a generic string, but in development it is the raw exception, and
 * this component renders in both. Putting it on screen would mean a stack trace or a
 * Postgres error naming a column is one NODE_ENV mistake away from a guest (§13). The
 * digest is shown instead — it is an opaque hash that correlates to the server log,
 * which is exactly what a support conversation needs and nothing more.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The platform captures this; the browser console is where a developer looks first.
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
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={reset}>
            נסו שוב
          </Button>
          <Link href="/" className={buttonClass({ variant: 'outline', size: 'lg' })}>
            לדף הבית
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
