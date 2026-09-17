'use client';

import { useMemo, useState } from 'react';

import { FilterChips } from '@/components/ui/filter-chips';
import { Icon } from '@/components/ui/icons';
import { SearchInput } from '@/components/ui/search-input';
import { RsvpRow, type RsvpRowData } from '@/features/admin/RsvpRow';

type StatusFilter = 'all' | 'attending' | 'maybe' | 'not_attending';

/**
 * The reply list, with the two controls a host actually reaches for (§8).
 *
 * A wedding collects three hundred replies, and the page rendered them as one long
 * list with no way in: finding the family that said "maybe", or the one guest whose
 * phone number the host half-remembers, meant reading top to bottom. A status filter
 * and a search box are the whole addition — both client-side over rows the page already
 * loaded, so nothing new is fetched and the list works exactly as before with the
 * controls untouched.
 *
 * The counts on the chips double as a summary: "מגיעים 212 · אולי 14 · לא מגיעים 31"
 * is readable before anyone taps.
 */
export function RsvpList({ rows, eventId }: { rows: readonly RsvpRowData[]; eventId: string }) {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(
    () => ({
      attending: rows.filter((row) => row.attendance_status === 'attending').length,
      maybe: rows.filter((row) => row.attendance_status === 'maybe').length,
      not_attending: rows.filter((row) => row.attendance_status === 'not_attending').length,
    }),
    [rows],
  );

  const shown = useMemo(() => {
    const needle = query
      .trim()
      .toLocaleLowerCase('he-IL')
      .replace(/[\s()-]/g, '');
    return rows.filter((row) => {
      if (status !== 'all' && row.attendance_status !== status) return false;
      if (needle === '') return true;
      return [row.full_name, row.phone_normalized, row.dietary_requirements ?? '', row.notes ?? '']
        .join(' ')
        .toLocaleLowerCase('he-IL')
        .replace(/[\s()-]/g, '')
        .includes(needle);
    });
  }, [rows, status, query]);

  return (
    <div className="mt-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          label="סינון לפי סטטוס"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'הכול', count: rows.length },
            { value: 'attending', label: 'מגיעים', count: counts.attending, tone: 'success' },
            { value: 'maybe', label: 'אולי', count: counts.maybe, tone: 'warning' },
            {
              value: 'not_attending',
              label: 'לא מגיעים',
              count: counts.not_attending,
              tone: 'danger',
            },
          ]}
        />
        <SearchInput
          label="חיפוש בתשובות"
          placeholder="שם, טלפון או הערה"
          value={query}
          onValueChange={setQuery}
          className="lg:w-72"
        />
      </div>

      <p className="text-muted-foreground mt-3 text-xs" aria-live="polite">
        {shown.length === rows.length
          ? `${rows.length} תשובות`
          : `מוצגות ${shown.length} מתוך ${rows.length} תשובות`}
        {' · '}המספרים בסוגריים: מבוגרים / ילדים / תינוקות
      </p>

      {shown.length === 0 ? (
        <div className="border-border bg-card/60 mt-4 flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center">
          <Icon name="search" className="text-accent-strong size-6" />
          <p className="text-primary mt-3 font-semibold">לא נמצאו תשובות מתאימות</p>
          <p className="text-muted-foreground mt-1 text-sm">נסו סינון אחר או חיפוש קצר יותר.</p>
        </div>
      ) : (
        <div className="border-border bg-card shadow-paper mt-4 overflow-hidden rounded-2xl border">
          <div
            aria-hidden="true"
            className="text-muted-foreground bg-secondary/40 hidden grid-cols-[1.4fr_1.1fr_0.8fr_0.9fr_1.5fr_auto] gap-4 border-b px-4 py-2.5 text-xs font-semibold lg:grid"
          >
            <span>שם</span>
            <span>טלפון</span>
            <span>סטטוס</span>
            <span>כמות</span>
            <span>תזונה והערות</span>
            <span className="w-20 text-end">פעולות</span>
          </div>
          <ul className="divide-border divide-y">
            {shown.map((rsvp) => (
              <RsvpRow key={rsvp.id} rsvp={rsvp} eventId={eventId} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
