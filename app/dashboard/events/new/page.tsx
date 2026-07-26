import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createEventAction } from '@/app/actions/manageEvent';
import { EventForm } from '@/features/admin/EventForm';
import { createUserClient } from '@/lib/server/supabase';

export const metadata: Metadata = {
  title: 'אירוע חדש',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function NewEventPage() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect('/login');

  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-primary font-[family-name:var(--font-display)] text-3xl font-bold">
        אירוע חדש
      </h1>
      <div className="bg-card mt-6 rounded-2xl border p-6">
        <EventForm action={createEventAction} submitLabel="יצירת האירוע" />
      </div>
    </main>
  );
}
