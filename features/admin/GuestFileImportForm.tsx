'use client';

import { adminImportGuestFileAction } from '@/app/actions/adminGuestFileImport';
import { importGuestFileAction } from '@/app/actions/manageGuests';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { Icon } from '@/components/ui/icons';

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
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="bg-accent-soft/70 text-accent-strong flex size-11 shrink-0 items-center justify-center rounded-xl"
        >
          <Icon name="file-spreadsheet" className="size-5" />
        </span>
        <div>
          <p className="text-eyebrow text-accent-strong font-semibold">קובץ אנשי קשר</p>
          <h2 className="text-primary mt-1 text-xl font-bold sm:text-2xl">
            ייבוא מהטלפון או מהמחשב
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            אפשר לבחור קובץ Excel, CSV או TSV שנשמר במכשיר. שם וטלפון הם שדות החובה, וייבוא חוזר
            מעדכן לפי מספר הטלפון בלי ליצור כפילויות.
          </p>
        </div>
      </div>
      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="eventId" value={eventId} />
        <Field label="בחירת קובץ" required>
          <Input
            name="guestFile"
            type="file"
            accept=".xlsx,.csv,.tsv,.txt"
            className="file:bg-secondary file:text-secondary-foreground py-2 file:me-3 file:rounded-full file:border-0 file:px-3 file:py-1 file:text-sm file:font-semibold"
          />
        </Field>
        <Button type="submit" variant="outline">
          <Icon name="upload" />
          ייבוא קובץ
        </Button>
      </form>
    </Card>
  );
}
