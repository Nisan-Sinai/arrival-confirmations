'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

import { buttonClass } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export interface MobileNavItem {
  readonly href: string;
  readonly label: string;
  readonly primary?: boolean;
  /** Rendered with the target language's `lang`, for the language switch. */
  readonly lang?: string;
}

/**
 * The phone menu behind the public header's hamburger.
 *
 * The header used to solve "four links do not fit 390px" by dropping the pricing link
 * below `sm`. That kept the bar honest but sent a phone visitor — most visitors — to
 * the footer to find the plans. A sheet that drops from the bar holds every link at a
 * full 48px height, which is also the first time the public navigation has met the
 * target-size criterion on a phone.
 *
 * Plain state and a `<div>` rather than a `<dialog>`: this is a disclosure, not a modal.
 * The page behind it stays reachable, so it needs no focus trap — only Escape, a close
 * on navigation, and focus handed back to the button that opened it.
 */
export function MobileNav({
  items,
  openLabel,
  closeLabel,
  className,
}: {
  items: readonly MobileNavItem[];
  openLabel: string;
  closeLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetId = useId();

  // A navigation closes the menu; the new page should not open with the old sheet up.
  // Reconciled during render rather than in an effect, so the closed sheet never paints.
  const [seenPathname, setSeenPathname] = useState(pathname);
  if (pathname !== seenPathname) {
    setSeenPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={cn('sm:hidden', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={sheetId}
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((current) => !current)}
        className={buttonClass({ variant: 'ghost', size: 'icon', className: 'text-primary' })}
      >
        <Icon name={open ? 'x' : 'menu'} strokeWidth={1.9} className="size-6" />
      </button>

      {open && (
        <div
          id={sheetId}
          className="nav-sheet border-border bg-background/95 shadow-lifted absolute inset-x-0 top-full z-[var(--z-overlay)] border-b backdrop-blur-md"
        >
          <ul className="flex flex-col gap-1 px-4 py-3">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  lang={item.lang}
                  hrefLang={item.lang}
                  onClick={() => setOpen(false)}
                  className={
                    item.primary
                      ? buttonClass({ size: 'md', block: true, className: 'mt-2' })
                      : 'text-primary hover:bg-secondary/60 flex min-h-12 items-center rounded-xl px-3 text-base font-semibold transition-colors duration-[--duration-fast]'
                  }
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
