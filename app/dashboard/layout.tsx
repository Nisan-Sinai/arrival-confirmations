import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { signOutAction } from '@/app/actions/auth';
import { Button, buttonClass } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { createUserClient } from '@/lib/server/supabase';

/**
 * The host area's shell (§13 of the design brief).
 *
 * A top bar rather than a sidebar. A sidebar is the right answer for a product with a
 * dozen destinations; this one has two — the event list and the event you are looking
 * at — and a permanent 240px rail to hold them would cost the table its width on a
 * laptop and fold into a drawer on a phone that nobody would open twice.
 *
 * The identity check here is a convenience, not the control. §4.4 requires every route
 * to check for itself and every page below still does, because a layout is not a
 * security boundary: Next.js does not re-run it for every navigation, and RLS is what
 * actually scopes the rows.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect('/login');

  return (
    <>
      <header className="border-border/70 bg-background/85 sticky top-0 z-[--z-header] border-b backdrop-blur-md">
        <Container width="wide" className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-primary flex items-center gap-2.5 rounded-md font-[family-name:var(--font-display)] text-lg font-bold"
          >
            <span
              aria-hidden="true"
              className="border-accent-strong/40 text-accent-strong flex size-8 shrink-0 items-center justify-center rounded-full border"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
                <path d="M4 8l8 5 8-5" />
              </svg>
            </span>
            <span className="hidden sm:inline">אישורי הגעה</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* The address is the only reliable way to tell two accounts apart on a
                shared machine, so it stays visible rather than hiding in a menu. */}
            <span
              className="text-muted-foreground hidden max-w-[16rem] truncate text-sm sm:inline"
              dir="ltr"
            >
              {user.email}
            </span>
            <Link
              href="/dashboard/events/new"
              className={buttonClass({ size: 'sm', className: 'whitespace-nowrap' })}
            >
              אירוע חדש
            </Link>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                התנתקות
              </Button>
            </form>
          </div>
        </Container>
      </header>
      {children}
    </>
  );
}
