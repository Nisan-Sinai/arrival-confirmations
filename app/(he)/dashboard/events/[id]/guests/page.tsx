import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  readonly searchParams: Promise<{
    saved?: string;
    error?: string;
    count?: string;
    skipped?: string;
  }>;
}

function SummaryCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Card padding="md" className="min-w-0">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-primary mt-1 text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
    </Card>
  );
}

export default async function GuestPage({ params, searchParams }: GuestPageProps) {
  const { id } = await params;
  const { saved = '', error = '', count = '', skipped = '' } = await searchParams;
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
      .select(
        'id, full_name, phone, email, party_size, table_name, seat_number, notes, checked_in_at, invite_link_issued_at, invite_first_opened_at, invite_last_opened_at, invite_open_count, invite_last_response_at, invite_last_response_status',
      )
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
    checkedInAt: guest.checked_in_at,
    inviteLinkIssuedAt: guest.invite_link_issued_at,
    inviteFirstOpenedAt: guest.invite_first_opened_at,
    inviteLastOpenedAt: guest.invite_last_opened_at,
    inviteOpenCount: guest.invite_open_count,
    inviteLastResponseAt: guest.invite_last_response_at,
    inviteLastResponseStatus: guest.invite_last_response_status,
  }));
  const totalPeople = guestRows.reduce((sum, guest) => sum + guest.partySize, 0);
  const openedInvites = guestRows.filter((guest) => guest.inviteOpenCount > 0).length;
  const answeredInvites = guestRows.filter(
    (guest) => guest.inviteLastResponseStatus !== null,
  ).length;

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
              הוספה ועריכה ידנית, ייבוא אנשי קשר מהטלפון או מקובץ, שליחת קישורים אישיים ומעקב אחרי
              פתיחה ותשובה.
            </p>
          </div>
          <Link
            href={`/e/${event.public_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: 'outline' })}
          >
            צפייה בהזמנה
          </Link>
        </div>

        <section
          aria-label="סיכום רשימת המוזמנים"
          className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <SummaryCard label="רשומות" value={guestRows.length} hint="אנשי קשר פעילים" />
          <SummaryCard label="סה״כ אנשים" value={totalPeople} hint="לפי הכמות בכל רשומה" />
          <SummaryCard label="פתחו הזמנה" value={openedInvites} hint="קישור אישי שנפתח" />
          <SummaryCard label="כבר ענו" value={answeredInvites} hint="מגיעים, לא מגיעים או אולי" />
        </section>

        <div className="mt-8 space-y-6">
          <GuestManagementPanel
            mode="owner"
            eventId={event.id}
            guests={guestRows}
            saved={saved}
            error={error}
            count={count}
            skipped={skipped}
          />
          <PersonalInviteSendList guests={guestRows} />
        </div>
      </Container>
    </main>
  );
}
