'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { Button, buttonClass } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { Container } from '@/components/ui/layout';
import { BrandMark } from '@/features/layout/BrandMark';
import { cn } from '@/lib/utils';

/**
 * The one header for every signed-in screen.
 *
 * There used to be two, and moving between them was the complaint that produced this
 * file. `/admin/*` rendered "ניהול המערכת" over an email address, in two stacked lines,
 * beside three section tabs. `/dashboard/*` rendered the brand mark on one line beside a
 * different set of four links. Neither knew about the other, so following the
 * "האירועים שלי" tab out of the admin area replaced the entire bar — different title,
 * different height, different buttons — and on a phone the admin header stacked to two
 * rows (`flex-col`) while the dashboard stayed at one. The page appeared to jump.
 *
 * One row, one height, on every screen and every viewport. What changes between an
 * owner and a customer is which navigation sits in the middle, and that is settled once
 * per session rather than per page, so nothing moves as you navigate.
 *
 * The section tabs are a segmented strip — a single quiet track with the current section
 * filled — rather than a row of loose buttons, which is what lets the bar hold three
 * tabs, an account chip and two actions without any of them competing for the one
 * primary colour. Labels shorten below `sm` rather than wrapping or scrolling.
 */

const OWNER_TABS = [
  { href: '/dashboard', label: 'האירועים שלי', short: 'אירועים', icon: 'calendar' },
  { href: '/admin/events', label: 'לקוחות ואירועים', short: 'לקוחות', icon: 'users' },
  { href: '/admin/plans', label: 'מסלולים ותשלומים', short: 'מסלולים', icon: 'credit-card' },
] as const;

/** Matches the section, not just the page, so a nested route keeps its tab lit. */
function isCurrentSection(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Tab({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: (typeof OWNER_TABS)[number]['icon'] | 'home';
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-9 min-w-0 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap sm:px-3.5 sm:text-sm',
        'transition-[background-color,color,box-shadow] duration-[--duration-fast] ease-[--ease-out]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring]',
        active
          ? 'bg-card text-primary shadow-paper'
          : 'text-muted-foreground hover:text-primary hover:bg-card/60',
      )}
    >
      <Icon name={icon} className="hidden size-4 sm:block" />
      {children}
    </Link>
  );
}

export function ConsoleHeader({
  email,
  isPlatformOwner,
  signOut,
}: {
  email: string | null;
  isPlatformOwner: boolean;
  /** The server action, passed down so this component stays a pure client component. */
  signOut: () => void | Promise<void>;
}): ReactNode {
  const pathname = usePathname();

  return (
    <header className="border-border/70 bg-background/90 sticky top-0 z-[var(--z-header)] border-b backdrop-blur-md">
      <Container
        width="wide"
        className="flex min-h-16 flex-nowrap items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-8"
      >
        <Link
          href="/dashboard"
          aria-label="דף הבית של הלקוח"
          className="text-primary flex shrink-0 items-center gap-2.5 rounded-md font-[family-name:var(--font-display)] text-lg font-bold"
        >
          <BrandMark className="size-8 shrink-0" />
          <span className="hidden lg:inline">אישורי הגעה</span>
        </Link>

        <nav
          aria-label="ניווט אזור הניהול"
          className="bg-secondary/50 flex min-w-0 items-center gap-0.5 rounded-full p-1"
        >
          {isPlatformOwner ? (
            OWNER_TABS.map((tab) => (
              <Tab
                key={tab.href}
                href={tab.href}
                icon={tab.icon}
                active={isCurrentSection(pathname, tab.href)}
              >
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </Tab>
            ))
          ) : (
            /*
             * A customer has no sections to move between, so the home link stands in for
             * the tab strip and the row keeps its shape. For the owner the same
             * destination is the first tab, which is why it is not repeated there.
             */
            <Tab href="/dashboard" icon="home" active={pathname === '/dashboard'}>
              <span className="sm:hidden">בית</span>
              <span className="hidden sm:inline">דף הבית שלי</span>
            </Tab>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Identification, not navigation — the first thing to go when space is tight. */}
          {email !== null && (
            <span
              className="text-muted-foreground border-border bg-card hidden max-w-[13rem] items-center gap-2 rounded-full border py-1 ps-1 pe-3 text-xs xl:inline-flex"
              title={email}
            >
              <span className="bg-secondary text-primary flex size-6 items-center justify-center rounded-full text-[11px] font-bold uppercase">
                {email.slice(0, 1)}
              </span>
              <span className="truncate" dir="ltr">
                {email}
              </span>
            </span>
          )}

          <Link
            href="/dashboard/events/new"
            className={buttonClass({
              size: 'sm',
              className: 'h-9 px-3 text-xs sm:px-4 sm:text-sm',
            })}
          >
            <Icon name="plus" strokeWidth={2.2} />
            <span className="sm:hidden">חדש</span>
            <span className="hidden sm:inline">אירוע חדש</span>
          </Link>

          <form action={signOut} className="shrink-0">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              aria-label="התנתקות"
              data-tooltip="התנתקות"
              className="tooltip-host text-muted-foreground hover:text-primary h-9 w-9 px-0 sm:w-auto sm:px-3"
            >
              <Icon name="logout" />
              <span className="hidden sm:inline">התנתקות</span>
            </Button>
          </form>
        </div>
      </Container>
    </header>
  );
}
