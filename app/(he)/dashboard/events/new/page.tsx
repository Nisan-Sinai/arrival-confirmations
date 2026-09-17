import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createEventAction } from '@/app/actions/manageEvent';
import { EventForm } from '@/features/admin/EventForm';
import { EventFormPage } from '@/features/admin/EventFormPage';
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
    <EventFormPage
      backHref="/dashboard"
      backLabel="כל האירועים"
      eyebrow="אירוע"
      title="אירוע חדש"
      lede="מלאו את הפרטים ונייצר עבורכם הזמנה מעוצבת וקישור פרטי לשליחה. אפשר לשנות הכול אחר כך."
    >
      <EventForm action={createEventAction} submitLabel="יצירת האירוע" />
    </EventFormPage>
  );
}
