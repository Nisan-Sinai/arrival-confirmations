import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requirePlatformOwner } from '@/app/_lib/platformAdmin';
import { adminUpdateCustomerEventAction } from '@/app/actions/manageAdminCustomerEvent';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/layout';
import { EventForm } from '@/features/admin/EventForm';
import { createPrivilegedClient } from '@/lib/server/supabase';

export const metadata: Metadata = {
  title: 'עריכת אירוע לקוח',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminEditCustomerEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformOwner();
  const { id } = await params;
  const privileged = createPrivilegedClient();
  const { data: event, error } = await privileged
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || event === null) notFound();

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="card">
        <Link
          href={`/admin/events/${id}`}
          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 rounded-sm text-sm"
        >
          חזרה לניהול האירוע
        </Link>

        <div className="mt-4">
          <p className="text-eyebrow text-accent-strong font-semibold">מצב מנהל־על</p>
          <h1 className="text-h1 text-primary mt-2 font-bold">עריכת {event.title}</h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            השינוי נשמר באירוע של הלקוח ומופיע מיד בהזמנה הציבורית. הקישור הקיים נשאר ללא שינוי.
          </p>
        </div>

        <Card padding="lg" className="mt-8">
          <EventForm
            action={adminUpdateCustomerEventAction}
            submitLabel="שמירת השינויים באירוע הלקוח"
            defaults={event}
          />
        </Card>
      </Container>
    </main>
  );
}
