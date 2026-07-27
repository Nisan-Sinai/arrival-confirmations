import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { updateEventAction } from '@/app/actions/manageEvent';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/layout';
import { EventForm } from '@/features/admin/EventForm';
import { createUserClient } from '@/lib/server/supabase';

export const metadata: Metadata = {
  title: 'עריכת אירוע',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createUserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect('/login');

  // RLS scopes this to the caller's own events, so another host's id is not found.
  const { data: event } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  if (event === null) notFound();

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="card">
        <Link
          href={`/dashboard/events/${id}`}
          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 rounded-sm text-sm"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          חזרה לאישורי ההגעה
        </Link>

        <div className="mt-4">
          <p className="text-eyebrow text-accent-strong font-semibold">עריכה</p>
          <h1 className="text-h1 text-primary mt-2 font-bold">{event.title}</h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            שינויים מופיעים בהזמנה מיד. הקישור שכבר שלחתם נשאר אותו קישור.
          </p>
        </div>

        <Card padding="lg" className="mt-8">
          <EventForm action={updateEventAction} submitLabel="שמירת שינויים" defaults={event} />
        </Card>
      </Container>
    </main>
  );
}
