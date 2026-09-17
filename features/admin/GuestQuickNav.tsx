import { Icon, type IconName } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

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
