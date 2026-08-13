import type { Metadata } from 'next';
import Link from 'next/link';

import { requirePlatformOwner } from '@/app/_lib/platformAdmin';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';
import { formatEventDate } from '@/lib/eventDate';
import { createPrivilegedClient } from '@/lib/server/supabase';

export const metadata: Metadata = {
  title: 'לקוחות ואירועים',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const fieldClass =
  'border-border-strong bg-background text-foreground min-h-11 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring]';

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePlatformOwner();
  const { q = '' } = await searchParams;
  const query = q.trim().toLowerCase();
  const privileged = createPrivilegedClient();

  const [{ data: events, error }, { data: usersData }] = await Promise.all([
    privileged
      .from('events')
      .select(
        'id, owner_user_id, public_id, title, event_date, venue_name, contact_phone, is_active, created_at',
      )
      .order('created_at', { ascending: false }),
    privileged.auth.admin.listUsers({ page: 1, perPage: 1_000 }),
  ]);
  if (error) throw new Error(`Admin event list failed: ${error.code}`);

  const ownerEmails = new Map(
    (usersData?.users ?? []).map((user) => [user.id, user.email ?? 'ללא אימייל'] as const),
  );
  const rows = (events ?? []).filter((event) => {
    if (query === '') return true;
    const ownerEmail =
      event.owner_user_id === null ? '' : (ownerEmails.get(event.owner_user_id) ?? '');
    return [event.title, ownerEmail, event.contact_phone ?? '', event.public_id, event.id]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="wide">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow text-accent-strong font-semibold">ניהול מערכת</p>
            <h1 className="text-h1 text-primary mt-2 font-bold">לקוחות ואירועים</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
              לחיצה על שם האירוע או על אימייל הלקוח פותחת את האירוע במצב מנהל־על, כולל עריכה,
              מוזמנים, ייבוא מהטלפון ואישורי הגעה.
            </p>
          </div>
          <Badge tone="outline">{events?.length ?? 0} אירועים במערכת</Badge>
        </div>

        <form role="search" className="mt-8 flex max-w-2xl gap-3">
          <label className="sr-only" htmlFor="customer-event-search">
            חיפוש לקוח או אירוע
          </label>
          <input
            id="customer-event-search"
            name="q"
            defaultValue={q}
            placeholder="שם אירוע, אימייל, טלפון או מזהה"
            className={fieldClass}
          />
          <Button type="submit" variant="outline">
            חיפוש
          </Button>
        </form>

        {rows.length === 0 ? (
          <EmptyState
            className="mt-10"
            title="לא נמצאו אירועים"
            description="נסו לחפש לפי שם האירוע, אימייל הלקוח, טלפון או מזהה."
          />
        ) : (
          <ul className="mt-10 grid gap-4 lg:grid-cols-2">
            {rows.map((event) => {
              const ownerEmail =
                event.owner_user_id === null
                  ? 'ללא בעלים'
                  : (ownerEmails.get(event.owner_user_id) ?? event.owner_user_id);
              const adminUrl = `/admin/events/${event.id}`;
              const previewUrl = `/admin/events/${event.id}/preview`;

              return (
                <li key={event.id}>
                  <Card interactive padding="lg" className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-h3 text-primary font-semibold">
                          <Link
                            href={adminUrl}
                            className="rounded-sm underline-offset-4 hover:underline"
                          >
                            {event.title}
                          </Link>
                        </h2>
                        <Link
                          href={adminUrl}
                          className="text-muted-foreground mt-1 block rounded-sm text-sm underline-offset-4 hover:underline"
                          dir="ltr"
                        >
                          {ownerEmail}
                        </Link>
                      </div>
                      <Badge tone={event.is_active ? 'success' : 'warning'}>
                        {event.is_active ? 'מפורסם' : 'טיוטה'}
                      </Badge>
                    </div>

                    <dl className="mt-5 space-y-2 text-sm">
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">תאריך:</dt>
                        <dd className="text-foreground font-medium">
                          {formatEventDate(event.event_date)}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">מקום:</dt>
                        <dd className="text-foreground font-medium">{event.venue_name}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">טלפון:</dt>
                        <dd className="text-foreground font-medium" dir="ltr">
                          {event.contact_phone ?? 'לא הוגדר'}
                        </dd>
                      </div>
                    </dl>

                    <div className="border-border mt-auto flex flex-wrap gap-2 border-t pt-5">
                      <Link href={adminUrl} className={buttonClass({ size: 'sm' })}>
                        כניסה לאירוע הלקוח
                      </Link>
                      <Link
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClass({ variant: 'outline', size: 'sm' })}
                      >
                        תצוגה מקדימה להזמנה
                      </Link>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </main>
  );
}
