'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { buttonClass } from '@/components/ui/button';

const ADMIN_LINKS = [
  { href: '/dashboard', label: 'האירועים שלי' },
  { href: '/admin/events', label: 'לקוחות ואירועים' },
  { href: '/admin/plans', label: 'מסלולים ותשלומים' },
] as const;

function isCurrentPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ניווט ניהול"
      className="grid w-full grid-cols-3 items-center gap-1 sm:flex sm:w-auto sm:gap-2"
    >
      {ADMIN_LINKS.map((link) => {
        const isActive = isCurrentPath(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={buttonClass({
              variant: isActive ? 'primary' : 'ghost',
              size: 'sm',
              className:
                'h-9 min-w-0 px-1.5 text-[0.68rem] leading-none sm:h-10 sm:px-4 sm:text-sm',
            })}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
