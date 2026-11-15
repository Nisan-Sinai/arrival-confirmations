'use client';

import type { MouseEvent } from 'react';

import { Icon, type IconName } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

function jumpToDistantSection(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
    return;
  const { hash } = event.currentTarget;
  const section = document.getElementById(hash.slice(1));
  // A nearby fragment keeps native smooth scrolling. A jump across hundreds of rows
  // goes directly to the section so it cannot be interrupted midway through the list.
  if (!section || Math.abs(section.getBoundingClientRect().top) <= window.innerHeight * 2) return;

  event.preventDefault();
  if (window.location.hash !== hash) window.history.pushState(null, '', hash);
  section.scrollIntoView({ block: 'start', behavior: 'instant' });
  section.focus({ preventScroll: true });
}

/**
 * The sticky quick-jump bar above the guest-management sections.
 *
 * It lives at the page level, not inside {@link GuestManagementPanel}, on purpose: a
 * `position: sticky` element is bound by its own parent's box, and the owner bar links to
 * "שליחה ב-WhatsApp", which is a sibling panel *below* the management one. Nested inside
 * the panel, the bar vanished the moment the reader scrolled past it into the send
 * section. Rendered as the first child of the wrapper that holds every section it points
 * at, it stays pinned across all of them.
 */
export function GuestQuickNav({
  mode,
  guestCount,
}: {
  readonly mode: 'admin' | 'owner';
  readonly guestCount: number;
}) {
  // Every chip is an equal jump link, styled the same. An earlier version filled the first
  // one as if it were a selected tab, so "הוספה ידנית" always looked like the current
  // section when it was only ever an anchor.
  const quickLink = (href: string, label: string, icon: IconName) => (
    <a
      href={href}
      onClick={jumpToDistantSection}
      className={cn(
        'text-primary hover:bg-card inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold whitespace-nowrap sm:h-9 sm:px-3.5 sm:text-sm',
        'transition-[background-color,color] duration-[--duration-fast]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring]',
      )}
    >
      <Icon name={icon} className="size-4" />
      {label}
    </a>
  );

  return (
    // The chips wrap onto as many rows as they need instead of a horizontal scroll strip —
    // on a phone the row would otherwise slide left/right with links hidden off-screen. A
    // solid background (no backdrop blur) keeps the sticky bar cheap to repaint while the
    // long guest list scrolls under it.
    <nav
      aria-label="פעולות מהירות לניהול המוזמנים"
      className="border-border bg-secondary shadow-paper sticky top-[4.5rem] z-10 rounded-2xl border p-1.5"
    >
      <div className="flex flex-wrap gap-1">
        {quickLink('#manual-add', 'הוספה ידנית', 'user-plus')}
        {quickLink('#phone-import', 'אנשי קשר מהטלפון', 'contacts')}
        {mode === 'owner' && (
          <>
            {quickLink('#file-import', 'ייבוא קובץ', 'file-spreadsheet')}
            {quickLink('#whatsapp-send-center', 'שליחה ב-WhatsApp', 'whatsapp')}
          </>
        )}
        {quickLink('#guest-list', `הרשימה (${guestCount})`, 'users')}
      </div>
    </nav>
  );
}
