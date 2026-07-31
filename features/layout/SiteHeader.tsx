import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { cn } from '@/lib/utils';

export function SiteHeader({
  className,
  minimal = false,
}: {
  className?: string;
  minimal?: boolean;
}) {
  return (
    <header
      className={cn(
        'border-border/70 bg-background/85 sticky top-0 z-[--z-header] border-b backdrop-blur-md',
        className,
      )}
    >
      <Container className="flex min-h-16 items-center justify-between gap-3 py-2 sm:min-h-18">
        <Link
          href="/"
          aria-label="דף הבית — אישורי הגעה"
          className="text-primary flex items-center gap-2.5 rounded-md font-[family-name:var(--font-display)] text-lg font-bold sm:text-xl"
        >
          <span
            aria-hidden="true"
            className="border-accent-strong/40 text-accent-strong flex size-9 shrink-0 items-center justify-center rounded-full border"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4.5"
            >
              <path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
              <path d="M4 8l8 5 8-5" />
              <path d="M12 8V4M9.5 5.5 12 4l2.5 1.5" />
            </svg>
          </span>
          <span className="hidden sm:inline">אישורי הגעה</span>
        </Link>

        {!minimal && (
          <nav aria-label="ניווט ראשי" className="flex items-center gap-1 sm:gap-2">
            <Link href="/pricing" className={buttonClass({ variant: 'ghost', size: 'sm' })}>
              מחירים
            </Link>
            <Link href="/login" className={buttonClass({ variant: 'ghost', size: 'sm' })}>
              כניסה
            </Link>
            <Link href="/signup" className={buttonClass({ size: 'sm' })}>
              יצירת אירוע
            </Link>
          </nav>
        )}
      </Container>
    </header>
  );
}
