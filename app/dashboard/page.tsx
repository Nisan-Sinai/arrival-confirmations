import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { signOutAction } from '@/app/actions/auth';
import { getEventTypePreset } from '@/config/eventTypes';
import { createUserClient } from '@/lib/server/supabase';

/**
 * The host's event list (§8).
 *
 * Authorisation happens here, in the server render, not in a layout and not in
 * middleware alone — §4.4 is explicit that every route performs its own check,
 * because hiding a link is not access control. RLS is the third layer: even a bug
 * here returns nothing, since the policies scope every row to the caller.
 */

export const metadata: Metadata = {
  title: 'האירועים שלי',
  robots: { index: false, follow: false },
};

// A host who just edited an event must see the edit, so nothing here is cached.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect('/login');

  // No .eq('owner_user_id', ...) needed — the policy already restricts this to the
  // caller's rows. Adding it would only hide a policy failure from the tests.
  const { data: events } = await supabase
    .from('events')
    .select('id, public_id, title, event_type, event_date, venue_name, is_active')
    .order('event_date', { ascending: true });

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-primary font-[family-name:var(--font-display)] text-3xl font-bold">
          האירועים שלי
        </h1>
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-muted-foreground hover:text-primary text-sm underline underline-offset-4"
          >
            התנתקות
          </button>
        </form>
      </div>
      <p className="text-muted-foreground mt-2 text-sm" dir="ltr">
        {user.email}
      </p>

      {(events ?? []).length === 0 ? (
        <p className="text-muted-foreground bg-card mt-8 rounded-2xl border p-8 text-center">
          עדיין אין לכם אירועים.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {(events ?? []).map((event) => (
            <li key={event.id} className="bg-card rounded-2xl border p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-primary text-lg font-semibold">{event.title}</h2>
                <span className="text-muted-foreground text-sm">
                  {getEventTypePreset(event.event_type).label}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {event.event_date} · {event.venue_name}
              </p>
              <p className="mt-3 text-sm">
                {/* The link a host sends. Shown in full so it can be copied by hand. */}
                <span className="text-muted-foreground">קישור להזמנה: </span>
                <Link
                  className="text-primary underline underline-offset-2"
                  href={`/e/${event.public_id}`}
                  dir="ltr"
                >
                  /e/{event.public_id}
                </Link>
                {!event.is_active && <span className="text-destructive mr-2">· לא מפורסם</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
