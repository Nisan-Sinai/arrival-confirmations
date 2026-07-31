import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { signOutAction } from '@/app/actions/auth';
import { PLATFORM_OWNER_EMAIL } from '@/app/_lib/platformAdmin';
import { Button, buttonClass } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { createUserClient } from '@/lib/server/supabase';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect('/login');

  const isPlatformOwner = user.email?.toLowerCase() === PLATFORM_OWNER_EMAIL;

  return (
    <>
      <header className="border-border/70 bg-background/85 sticky top-0 z-[--z-header] border-b backdrop-blur-md">
        <Container width="wide" className="flex min-h-16 items-center justify-between gap-3 py-2">
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

          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-3">
            <span
              className="text-muted-foreground hidden max-w-[14rem] truncate text-sm lg:inline"
              dir="ltr"
            >
              {user.email}
            </span>
            {isPlatformOwner && (
              <Link
                href="/admin/plans"
                className={buttonClass({ variant: 'outline', size: 'sm' })}
              >
                ניהול מסלולים
              </Link>
            )}
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
