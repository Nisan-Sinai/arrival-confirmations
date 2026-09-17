import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { updateEventAction } from '@/app/actions/manageEvent';
import { EventForm } from '@/features/admin/EventForm';
import { EventFormPage } from '@/features/admin/EventFormPage';
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
    <EventFormPage
      backHref={`/dashboard/events/${id}`}
      backLabel="חזרה לאישורי ההגעה"
      eyebrow="עריכה"
      title={event.title}
      lede="שינויים מופיעים בהזמנה מיד. הקישור שכבר שלחתם נשאר אותו קישור."
    >
      <EventForm action={updateEventAction} submitLabel="שמירת שינויים" defaults={event} />
    </EventFormPage>
  );
}
