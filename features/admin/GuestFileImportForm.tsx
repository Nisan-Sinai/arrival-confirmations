'use client';

import { adminImportGuestFileAction } from '@/app/actions/adminGuestFileImport';
import { importGuestFileAction } from '@/app/actions/manageGuests';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const fieldClass =
  'border-border-strong bg-background text-foreground min-h-11 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring]';

export function GuestFileImportForm({
  mode,
  eventId,
}: {
  mode: 'owner' | 'admin';
  eventId: string;
}) {
  const action = mode === 'admin' ? adminImportGuestFileAction : importGuestFileAction;

  return (
    <Card padding="lg">
      <p className="text-eyebrow text-accent-strong font-semibold">קובץ אנשי קשר</p>
      <h2 className="text-h2 text-primary mt-2 font-bold">ייבוא מהטלפון או מהמחשב</h2>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        אפשר לבחור קובץ Excel, CSV או TSV שנשמר במכשיר. שם וטלפון הם שדות החובה, וייבוא חוזר מעדכן
        לפי מספר הטלפון בלי ליצור כפילויות.
      </p>
      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="eventId" value={eventId} />
        <label className="text-foreground block text-sm font-medium">
          בחירת קובץ
          <input
            name="guestFile"
            type="file"
            accept=".xlsx,.csv,.tsv,.txt"
            required
            className={`${fieldClass} mt-1.5 file:me-3 file:rounded-full file:border-0 file:px-3 file:py-1.5`}
          />
        </label>
        <Button type="submit" variant="outline">
          ייבוא קובץ
        </Button>
      </form>
    </Card>
  );
}
