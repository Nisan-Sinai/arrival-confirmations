import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { PLATFORM_OWNER_EMAIL } from '@/app/_lib/platformAdmin';
import { signOutAction } from '@/app/actions/auth';
import { Button, buttonClass } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { getAppCopy } from '@/config/appCopy';
import { LanguageSwitch } from '@/features/layout/LanguageSwitch';
import { localePath, type Locale } from '@/lib/i18n';
import { createUserClient } from '@/lib/server/supabase';

const MOBILE_HEADER_BUTTON_CLASS = 'h-10 shrink-0 gap-1 px-1.5 text-xs sm:gap-2 sm:px-4 sm:text-sm';

export async function DashboardShell({
  locale,
  children,
}: Readonly<{ locale: Locale; children: ReactNode }>) {
  const copy = getAppCopy(locale).dashboardNav;
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect(localePath(locale, '/login'));

  const isPlatformOwner = user.email?.toLowerCase() === PLATFORM_OWNER_EMAIL;

  return (
    <>
      <header className="border-border/70 bg-background/85 sticky top-0 z-[--z-header] border-b backdrop-blur-md">
        <Container
          width="wide"
          className="flex min-h-16 flex-nowrap items-center justify-between gap-1 px-2 py-2 sm:gap-3 sm:px-8"
        >
          <Link
            href={localePath(locale, '/dashboard')}
            aria-label={copy.homeAria}
            className="text-primary flex shrink-0 items-center gap-2.5 rounded-md font-[family-name:var(--font-display)] text-lg font-bold"
          >
            <span
              aria-hidden="true"
              className="border-accent-strong/40 text-accent-strong flex size-7 shrink-0 items-center justify-center rounded-full border sm:size-8"
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
            <span className="hidden sm:inline">{copy.product}</span>
          </Link>

          <nav
            aria-label={copy.navAria}
            className="flex min-w-0 flex-1 flex-nowrap items-center justify-between gap-0.5 sm:flex-none sm:justify-end sm:gap-3"
          >
            <span className="text-muted-foreground hidden max-w-[14rem] truncate text-sm lg:inline" dir="ltr">
              {user.email}
            </span>
            <LanguageSwitch locale={locale} />
            <Link
              href={localePath(locale, '/dashboard')}
              className={buttonClass({
                variant: 'ghost',
                size: 'sm',
                className: MOBILE_HEADER_BUTTON_CLASS,
              })}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 10 9-7 9 7" />
                <path d="M5 9v11h14V9" />
                <path d="M9 20v-6h6v6" />
              </svg>
              <span className="sm:hidden">{copy.homeShort}</span>
              <span className="hidden sm:inline">{copy.home}</span>
            </Link>
            {isPlatformOwner && (
              <Link
                href={localePath(locale, '/admin/plans')}
                className={buttonClass({
                  variant: 'outline',
                  size: 'sm',
                  className: MOBILE_HEADER_BUTTON_CLASS,
                })}
              >
                {copy.plans}
              </Link>
            )}
            <Link
              href={localePath(locale, '/dashboard/events/new')}
              className={buttonClass({ size: 'sm', className: MOBILE_HEADER_BUTTON_CLASS })}
            >
              {copy.newEvent}
            </Link>
            <form action={signOutAction} className="shrink-0">
              <input type="hidden" name="locale" value={locale} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className={MOBILE_HEADER_BUTTON_CLASS}
              >
                {copy.signOut}
              </Button>
            </form>
          </nav>
        </Container>
      </header>
      {children}
    </>
  );
}
