import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Rule } from '@/components/ui/layout';

export default function DashboardNotFound() {
  return (
    <main id="main" className="flex flex-1 items-center justify-center px-5 py-20 sm:py-28">
      <div className="w-full max-w-lg text-center">
        <p className="text-eyebrow text-accent-strong font-semibold">שגיאה 404</p>
        <h1 className="text-h1 text-primary mt-4 font-bold">העמוד שחיפשתם לא נמצא</h1>
        <Rule className="my-7" />
        <p className="text-muted-foreground text-lead leading-relaxed">
          ייתכן שהאירוע או העמוד נמחקו, או שהקישור כבר אינו מעודכן. אפשר לחזור מיד לדף הבית של
          החשבון ולבחור אירוע אחר.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/dashboard" className={buttonClass({ size: 'lg' })}>
            דף הבית שלי
          </Link>
          <Link
            href="/dashboard/events/new"
            className={buttonClass({ variant: 'outline', size: 'lg' })}
          >
            יצירת אירוע חדש
          </Link>
        </div>
      </div>
    </main>
  );
}
