'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';

import { adminImportGuestFileAction } from '@/app/actions/adminGuestImports';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';

const COPY = {
  he: {
    eyebrow: 'ייבוא קובץ',
    title: 'העלאת רשימת מוזמנים',
    intro: 'אפשר לייבא Excel, CSV, TSV או קובץ טקסט. שם וטלפון הם שדות חובה; רשומות קיימות מתעדכנות לפי מספר הטלפון.',
    file: 'קובץ מוזמנים',
    hint: 'עד 5MB. עמודות מומלצות: שם, טלפון, אימייל, כמות, שולחן, מושב והערות.',
    chosen: 'נבחר:',
    importing: 'מייבא…',
    submit: 'ייבוא הקובץ',
  },
  en: {
    eyebrow: 'File import',
    title: 'Upload guest list',
    intro: 'Import Excel, CSV, TSV or text files. Name and phone are required; existing records are updated by phone number.',
    file: 'Guest file',
    hint: 'Up to 5MB. Recommended columns: name, phone, email, party size, table, seat and notes.',
    chosen: 'Selected:',
    importing: 'Importing…',
    submit: 'Import file',
  },
} as const;

function SubmitButton({ pendingLabel, idleLabel }: { pendingLabel: string; idleLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

export function GuestFileImportForm({ eventId }: { readonly eventId: string }) {
  const locale = useAppLocale();
  const copy = COPY[locale];
  const [fileName, setFileName] = useState('');

  return (
    <Card padding="lg">
      <p className="text-eyebrow text-accent-strong font-semibold">{copy.eyebrow}</p>
      <h2 className="text-h2 text-primary mt-2 font-bold">{copy.title}</h2>
      <p className="text-muted-foreground mt-3 leading-relaxed">{copy.intro}</p>

      <form action={adminImportGuestFileAction} className="mt-6 space-y-4">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="locale" value={locale} />
        <label className="text-foreground block text-sm font-medium">
          {copy.file}
          <input
            name="guestFile"
            type="file"
            accept=".xlsx,.csv,.tsv,.txt"
            required
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')}
            className="border-border-strong bg-background text-foreground mt-1.5 min-h-11 w-full rounded-xl border px-3 py-2 text-sm file:me-3 file:rounded-full file:border-0 file:px-3 file:py-1.5"
          />
        </label>
        <p className="text-muted-foreground text-xs">{copy.hint}</p>
        {fileName !== '' && (
          <p className="text-primary text-sm font-medium" dir="auto">
            {copy.chosen} {fileName}
          </p>
        )}
        <SubmitButton pendingLabel={copy.importing} idleLabel={copy.submit} />
      </form>
    </Card>
  );
}
