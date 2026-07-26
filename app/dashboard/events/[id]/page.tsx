import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { UI_MESSAGES } from '@/config/messages';
import { formatIsraeliPhoneForDisplay } from '@/lib/phone';
import { createUserClient } from '@/lib/server/supabase';
import { computeResponseRate, computeRsvpStats } from '@/services/rsvpStats';

/**
 * One event's RSVP list (§8).
 *
 * The page a host actually opens: who replied, how many are coming, and what the
 * caterer needs to know. Everything is read through the caller's own session, so RLS
 * decides what exists — a mistake here returns nothing rather than someone else's
 * guest list.
 */

export const metadata: Metadata = {
  title: 'אישורי הגעה',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const STATUS_LABELS = {
  attending: 'מגיע',
  not_attending: 'לא מגיע',
  maybe: 'אולי',
} as const;

const STATUS_STYLES = {
  attending: 'bg-success/10 text-success',
  not_attending: 'bg-destructive/10 text-destructive',
  maybe: 'bg-accent/20 text-accent-foreground',
} as const;

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-xl border p-4 text-center">
      <div className="text-primary font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">
        {value}
      </div>
      <div className="text-muted-foreground mt-1 text-xs sm:text-sm">{label}</div>
    </div>
  );
}

export default async function EventRsvpsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createUserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect('/login');

  // RLS scopes this to events the caller owns, so a foreign id is simply not found.
  const { data: event } = await supabase
    .from('events')
    .select('id, public_id, title, event_date, venue_name')
    .eq('id', id)
    .maybeSingle();
  if (event === null) notFound();

  const [{ data: rsvps }, { data: guests }] = await Promise.all([
    supabase
      .from('rsvps')
      .select('*')
      .eq('event_id', id)
      .order('submitted_at', { ascending: false }),
    supabase.from('guests').select('id, is_active, token_revoked_at').eq('event_id', id),
  ]);

  const rows = rsvps ?? [];
  const stats = computeRsvpStats(rows);
  const rate = computeResponseRate(guests ?? [], rows);

  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Link className="text-muted-foreground hover:text-primary text-sm" href="/dashboard">
        ← כל האירועים
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-primary font-[family-name:var(--font-display)] text-3xl font-bold">
          {event.title}
        </h1>
        <Link
          href={`/dashboard/events/${event.id}/edit`}
          className="border-primary text-primary hover:bg-secondary/60 rounded-full border px-5 py-2 text-sm font-semibold transition-colors"
        >
          עריכת ההזמנה
        </Link>
      </div>
      <p className="text-muted-foreground mt-1 text-sm">
        {event.event_date} · {event.venue_name}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="סה״כ תשובות" value={stats.total} />
        <StatCard label="מגיעים" value={stats.attending} />
        <StatCard label="לא מגיעים" value={stats.notAttending} />
        <StatCard label="מתלבטים" value={stats.maybe} />
        <StatCard label="מבוגרים" value={stats.adults} />
        <StatCard label="ילדים" value={stats.children} />
        <StatCard label="תינוקות" value={stats.babies} />
        <StatCard label="סה״כ צפויים" value={stats.expectedAttendees} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <StatCard label="התקבלו היום" value={stats.receivedToday} />
        <StatCard
          label="אחוז מענה"
          // §8.1: with no guest list there is no denominator, so no percentage.
          value={
            rate.percentage === null
              ? UI_MESSAGES.admin.responseRateUnavailable
              : `${rate.percentage}%`
          }
        />
      </div>

      <h2 className="text-primary mt-10 text-xl font-semibold">התשובות</h2>

      {rows.length === 0 ? (
        <p className="text-muted-foreground bg-card mt-4 rounded-2xl border p-8 text-center">
          עדיין לא התקבלו אישורי הגעה. שלחו את הקישור: <span dir="ltr">/e/{event.public_id}</span>
        </p>
      ) : (
        /* §8 MOBILE: the table becomes cards rather than scrolling sideways. Both
           views render the same rows; only the presentation differs. */
        <>
          <ul className="mt-4 space-y-3 sm:hidden">
            {rows.map((r) => (
              <li key={r.id} className="bg-card rounded-xl border p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{r.full_name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[r.attendance_status]}`}
                  >
                    {STATUS_LABELS[r.attendance_status]}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-sm" dir="ltr">
                  {formatIsraeliPhoneForDisplay(r.phone_normalized)}
                </p>
                <p className="mt-2 text-sm">
                  {r.adults_count} מבוגרים · {r.children_count} ילדים · {r.babies_count} תינוקות
                </p>
                {r.dietary_requirements !== null && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    תזונה: {r.dietary_requirements}
                  </p>
                )}
                {r.notes !== null && (
                  <p className="text-muted-foreground mt-1 text-sm">הערה: {r.notes}</p>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">רשימת אישורי ההגעה לאירוע</caption>
              <thead>
                <tr className="border-b text-right">
                  <th scope="col" className="py-2 font-semibold">
                    שם
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    טלפון
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    סטטוס
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    מבוגרים
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    ילדים
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    תינוקות
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    תזונה
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    הערות
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2.5">{r.full_name}</td>
                    <td className="py-2.5" dir="ltr">
                      {formatIsraeliPhoneForDisplay(r.phone_normalized)}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[r.attendance_status]}`}
                      >
                        {STATUS_LABELS[r.attendance_status]}
                      </span>
                    </td>
                    <td className="py-2.5 tabular-nums">{r.adults_count}</td>
                    <td className="py-2.5 tabular-nums">{r.children_count}</td>
                    <td className="py-2.5 tabular-nums">{r.babies_count}</td>
                    <td className="text-muted-foreground py-2.5">
                      {r.dietary_requirements ?? '—'}
                    </td>
                    <td className="text-muted-foreground py-2.5">{r.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
