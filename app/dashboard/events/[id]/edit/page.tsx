import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { updateEventAction } from '@/app/actions/manageEvent';
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
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-primary font-[family-name:var(--font-display)] text-3xl font-bold">
        עריכת האירוע
      </h1>
      <div className="bg-card mt-6 rounded-2xl border p-6">
        <EventForm action={updateEventAction} submitLabel="שמירת שינויים" defaults={event} />
      </div>
    </main>
  );
}
