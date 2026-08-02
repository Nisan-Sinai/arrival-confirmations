import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import { buttonClass } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { GuestManagementPanel } from '@/features/admin/GuestManagementPanel';
import { PersonalInviteSendList } from '@/features/admin/PersonalInviteSendList';
import { createUserClient } from '@/lib/server/supabase';

export const metadata: Metadata = {
  title: 'ניהול מוזמנים',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface GuestPageProps {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{ saved?: string; error?: string; count?: string }>;
}

export default async function GuestPage({ params, searchParams }: GuestPageProps) {
  const { id } = await params;
  const { saved = '', error = '', count = '' } = await searchParams;
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect('/login');

  const guestDb = supabase as unknown as SupabaseClient;
  const [{ data: event }, { data: guests, error: guestsError }] = await Promise.all([
    guestDb.from('events').select('id, title, public_id').eq('id', id).maybeSingle(),
    guestDb
      .from('guests')
      .select('id, full_name, phone, email, party_size, table_name, seat_number, notes')
      .eq('event_id', id)
      .eq('is_active', true)
      .order('full_name'),
  ]);
  if (event === null) notFound();
  if (guestsError) throw new Error(`Guest list failed: ${guestsError.code}`);

  const guestRows = (guests ?? []).map((guest) => ({
    id: guest.id,
    fullName: guest.full_name,
    phone: guest.phone,
    email: guest.email,
    partySize: guest.party_size,
    tableName: guest.table_name,
    seatNumber: guest.seat_number,
    notes: guest.notes,
  }));

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="wide">
        <Link
          href={`/dashboard/events/${id}`}
          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 rounded-sm text-sm"
        >
          חזרה לאירוע
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow text-accent-strong font-semibold">רשימת מוזמנים</p>
            <h1 className="text-h1 text-primary mt-2 font-bold">{event.title}</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
              הוספה, עריכה ומחיקה ידנית, בחירת אנשי קשר מהטלפון, ייבוא קובץ ושליחת קישור אישי לכל
              מוזמן.
            </p>
          </div>
          <Link
            href={`/e/${event.public_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: 'outline' })}
          >
            צפייה בקישור הראשי
          </Link>
        </div>

        <div className="mt-8 space-y-6">
          <PersonalInviteSendList guests={guestRows} />
          <GuestManagementPanel
            mode="owner"
            eventId={event.id}
            guests={guestRows}
            saved={saved}
            error={error}
            count={count}
          />
        </div>
      </Container>
    </main>
  );
}
