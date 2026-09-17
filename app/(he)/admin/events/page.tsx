import type { Metadata } from 'next';
import Link from 'next/link';

import { requirePlatformOwner } from '@/app/_lib/platformAdmin';
import { adminCreateCustomerAction } from '@/app/actions/manageAdminCustomers';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/icons';
import { Container } from '@/components/ui/layout';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { UI_MESSAGES } from '@/config/messages';
import { CreateCustomerPanel } from '@/features/admin/CreateCustomerPanel';
import { DateTile } from '@/features/admin/DateTile';
import { createPrivilegedClient } from '@/lib/server/supabase';

export const metadata: Metadata = {
  title: 'לקוחות ואירועים',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; saved?: string; error?: string }>;
}) {
  await requirePlatformOwner();
  const { q = '', saved = '', error: actionError = '' } = await searchParams;
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
    <main id="main" className="flex-1 py-8 sm:py-12">
      <Container width="wide">
        <PageHeader
          eyebrow="ניהול מערכת"
          title="לקוחות ואירועים"
          lede="לחיצה על שם האירוע או על אימייל הלקוח פותחת את האירוע במצב מנהל־על, כולל עריכה, מוזמנים, ייבוא מהטלפון ואישורי הגעה."
          actions={<Badge tone="outline">{events?.length ?? 0} אירועים במערכת</Badge>}
        />

        <CreateCustomerPanel
          createCustomerAction={adminCreateCustomerAction}
          saved={saved}
          error={actionError}
        />

        <form role="search" className="mt-8 flex max-w-2xl gap-2">
          <SearchInput
            label="חיפוש לקוח או אירוע"
            name="q"
            defaultValue={q}
            placeholder="שם אירוע, אימייל, טלפון או מזהה"
            className="flex-1"
          />
          <Button type="submit" variant="outline">
            חיפוש
          </Button>
        </form>

        {rows.length === 0 ? (
          <EmptyState
            className="mt-10"
            icon={<Icon name="search" strokeWidth={1.5} className="size-6" />}
            title="לא נמצאו אירועים"
            description="נסו לחפש לפי שם האירוע, אימייל הלקוח, טלפון או מזהה."
          />
        ) : (
          <ul className="mt-8 grid gap-4 lg:grid-cols-2">
            {rows.map((event) => {
              const ownerEmail =
                event.owner_user_id === null
                  ? 'ללא בעלים'
                  : (ownerEmails.get(event.owner_user_id) ?? event.owner_user_id);
              const adminUrl = `/admin/events/${event.id}`;
              const previewUrl = `/admin/events/${event.id}/preview`;

              return (
                <li key={event.id}>
                  <Card interactive padding="md" className="flex h-full flex-col">
                    <div className="flex items-start gap-4">
                      <DateTile isoDate={event.event_date} />
                      <div className="min-w-0 flex-1">
                        <Badge tone={event.is_active ? 'success' : 'warning'} dot>
                          {event.is_active ? 'מפורסם' : 'טיוטה'}
                        </Badge>
                        <h2 className="text-primary mt-2 text-xl leading-snug font-bold">
                          <Link
                            href={adminUrl}
                            className="rounded-sm underline-offset-4 hover:underline"
                          >
                            {event.title}
                          </Link>
                        </h2>
                        <Link
                          href={adminUrl}
                          className="text-muted-foreground mt-1 inline-flex items-center gap-1.5 rounded-sm text-sm underline-offset-4 hover:underline"
                        >
                          <Icon name="user" className="size-3.5" />
                          <span dir="ltr">{ownerEmail}</span>
                        </Link>
                      </div>
                    </div>

                    <dl className="text-muted-foreground mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                      <div className="flex items-center gap-1.5">
                        <dt className="sr-only">מקום</dt>
                        <Icon name="map-pin" className="text-accent-strong size-4" />
                        <dd>{event.venue_name}</dd>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <dt className="sr-only">טלפון</dt>
                        <Icon name="phone" className="text-accent-strong size-4" />
                        <dd dir="ltr">{event.contact_phone ?? 'לא הוגדר'}</dd>
                      </div>
                    </dl>

                    <div className="border-border mt-auto flex flex-wrap gap-2 border-t pt-4">
                      <Link href={adminUrl} className={buttonClass({ size: 'sm' })}>
                        <Icon name="dashboard" />
                        כניסה לאירוע הלקוח
                      </Link>
                      <Link
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClass({ variant: 'outline', size: 'sm' })}
                      >
                        <Icon name="eye" />
                        תצוגה מקדימה{' '}
                        <span className="sr-only">({UI_MESSAGES.a11y.externalLink})</span>
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
