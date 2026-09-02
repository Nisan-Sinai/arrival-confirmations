'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { Button, buttonClass } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { BrandMark } from '@/features/layout/BrandMark';

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
 * Labels shorten below `sm` rather than wrapping or scrolling. Three tabs plus two
 * account actions do not fit 390px at full length — this is the same arithmetic that
 * pushed the public header's call to action off the screen — and a shorter label a
 * reader can see beats a full one they have to scroll sideways to find.
 */

const OWNER_TABS = [
  { href: '/dashboard', label: 'האירועים שלי', short: 'אירועים' },
  { href: '/admin/events', label: 'לקוחות ואירועים', short: 'לקוחות' },
  { href: '/admin/plans', label: 'מסלולים ותשלומים', short: 'מסלולים' },
] as const;

/** Matches the section, not just the page, so a nested route keeps its tab lit. */
function isCurrentSection(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sized to hold the widest label at each breakpoint without the row reflowing when the
 * active tab changes weight. `whitespace-nowrap` comes from `buttonClass` already.
 */
const NAV_BUTTON = 'h-9 min-w-0 px-2 text-xs sm:h-10 sm:px-4 sm:text-sm';

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
        className="flex min-h-16 flex-nowrap items-center justify-between gap-1 px-3 py-2 sm:gap-3 sm:px-8"
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
          className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-0.5 sm:gap-2"
        >
          {isPlatformOwner ? (
            OWNER_TABS.map((tab) => {
              const isActive = isCurrentSection(pathname, tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={isActive ? 'page' : undefined}
                  /*
                   * The active tab is `outline`, not `primary`.
                   *
                   * It was `primary`, which put two filled burgundy pills in one bar —
                   * the selected tab and "אירוע חדש" — competing for the same attention.
                   * The button system's own note rules that out: exactly one `primary`
                   * per view, and here it belongs to the action, not to a statement of
                   * where you already are.
                   *
                   * `outline` rather than `secondary` because `--secondary` sits at
                   * lightness 0.94 and `--border` at 0.90, so a secondary fill is
                   * literally paler than the outline beneath it in the hierarchy. The
                   * border reads as "selected" against borderless siblings and stays
                   * out of the call to action's way.
                   */
                  className={buttonClass({
                    variant: isActive ? 'outline' : 'ghost',
                    size: 'sm',
                    className: NAV_BUTTON,
                  })}
                >
                  <span className="sm:hidden">{tab.short}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </Link>
              );
            })
          ) : (
            /*
             * A customer has no sections to move between, so the home link stands in for
             * the tab strip and the row keeps its shape. For the owner the same
             * destination is the first tab, which is why it is not repeated there.
             */
            <Link
              href="/dashboard"
              aria-current={pathname === '/dashboard' ? 'page' : undefined}
              className={buttonClass({
                variant: pathname === '/dashboard' ? 'primary' : 'ghost',
                size: 'sm',
                className: NAV_BUTTON,
              })}
            >
              <span className="sm:hidden">בית</span>
              <span className="hidden sm:inline">דף הבית שלי</span>
            </Link>
          )}

          {/* Identification, not navigation — the first thing to go when space is tight. */}
          {email !== null && (
            <span
              className="text-muted-foreground hidden max-w-[13rem] truncate px-1 text-sm xl:inline"
              dir="ltr"
            >
              {email}
            </span>
          )}

          <Link
            href="/dashboard/events/new"
            className={buttonClass({ size: 'sm', className: NAV_BUTTON })}
          >
            <span className="sm:hidden">חדש</span>
            <span className="hidden sm:inline">אירוע חדש</span>
          </Link>

          <form action={signOut} className="shrink-0">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              aria-label="התנתקות"
              className={NAV_BUTTON}
            >
              {/* Icon only below `sm`: the label is the least useful two words in the row
                  on a phone, and the door glyph is unambiguous. `aria-label` above keeps
                  the accessible name at both sizes. */}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="sm:hidden"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              <span className="hidden sm:inline">התנתקות</span>
            </Button>
          </form>
        </nav>
      </Container>
    </header>
  );
}
