import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import { requirePlatformOwner } from '@/app/_lib/platformAdmin';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';
import { GuestFileImportForm } from '@/features/admin/GuestFileImportForm';
import { GuestManagementPanel } from '@/features/admin/GuestManagementPanel';
import { PersonalInviteSendList } from '@/features/admin/PersonalInviteSendList';
import { formatEventDate, formatEventWeekday } from '@/lib/eventDate';
import { createPrivilegedClient } from '@/lib/server/supabase';

export const metadata: Metadata = {
  title: 'ניהול אירוע לקוח',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface AdminCustomerEventPageProps {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{ saved?: string; error?: string; count?: string }>;
}

function attendanceLabel(status: string): string {
  if (status === 'attending') return 'מגיע/ה';
  if (status === 'not_attending') return 'לא מגיע/ה';
  return 'אולי';
}

function attendanceTone(status: string): 'success' | 'danger' | 'warning' {
  if (status === 'attending') return 'success';
  if (status === 'not_attending') return 'danger';
  return 'warning';
}

export default async function AdminCustomerEventPage({
  params,
  searchParams,
}: AdminCustomerEventPageProps) {
  await requirePlatformOwner();
  const { id } = await params;
  const { saved = '', error = '', count = '' } = await searchParams;
  const privileged = createPrivilegedClient() as unknown as SupabaseClient;

  const { data: event, error: eventError } = await privileged
    .from('events')
    .select(
      'id, owner_user_id, public_id, title, event_type, event_date, ceremony_time, reception_time, venue_name, address, contact_phone, is_active, expected_guests, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (eventError || event === null) notFound();

  const [{ data: guests, error: guestsError }, { data: rsvps, error: rsvpsError }] =
    await Promise.all([
      privileged
        .from('guests')
        .select(
          'id, full_name, phone, email, party_size, table_name, seat_number, notes, invite_link_issued_at, invite_first_opened_at, invite_last_opened_at, invite_open_count, invite_last_response_at, invite_last_response_status',
        )
        .eq('event_id', id)
        .eq('is_active', true)
        .order('full_name'),
      privileged
        .from('rsvps')
        .select(
          'id, full_name, phone, attendance_status, adults_count, children_count, babies_count, dietary_requirements, notes, submitted_at',
        )
        .eq('event_id', id)
        .order('submitted_at', { ascending: false }),
    ]);
  if (guestsError || rsvpsError) throw new Error('Admin event data failed to load');

  let ownerEmail = 'ללא בעלים';
  if (event.owner_user_id !== null) {
    const { data: ownerData } = await privileged.auth.admin.getUserById(event.owner_user_id);
    ownerEmail = ownerData.user?.email ?? event.owner_user_id;
  }

  const guestRows = (guests ?? []).map((guest) => ({
    id: guest.id,
    fullName: guest.full_name,
    phone: guest.phone,
    email: guest.email,
    partySize: guest.party_size,
    tableName: guest.table_name,
    seatNumber: guest.seat_number,
    notes: guest.notes,
    inviteLinkIssuedAt: guest.invite_link_issued_at,
    inviteFirstOpenedAt: guest.invite_first_opened_at,
    inviteLastOpenedAt: guest.invite_last_opened_at,
    inviteOpenCount: guest.invite_open_count,
    inviteLastResponseAt: guest.invite_last_response_at,
    inviteLastResponseStatus: guest.invite_last_response_status,
  }));
  const rsvpRows = rsvps ?? [];
  const attendingReplies = rsvpRows.filter(
    (response) => response.attendance_status === 'attending',
  ).length;
  const expectedAttendees = rsvpRows.reduce((total, response) => {
    if (response.attendance_status !== 'attending') return total;
    return total + response.adults_count + response.children_count + response.babies_count;
  }, 0);

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="wide">
        <Link
          href="/admin/events"
          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 rounded-sm text-sm"
        >
          חזרה לכל הלקוחות והאירועים
        </Link>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="gold">מצב מנהל־על</Badge>
              <Badge tone={event.is_active ? 'success' : 'warning'}>
                {event.is_active ? 'הזמנה מפורסמת' : 'טיוטה'}
              </Badge>
            </div>
            <h1 className="text-h1 text-primary mt-3 font-bold">{event.title}</h1>
            <p className="text-muted-foreground mt-2" dir="ltr">
              {ownerEmail}
            </p>
            <p className="text-muted-foreground mt-2">
              יום {formatEventWeekday(event.event_date)}, {formatEventDate(event.event_date)} ·{' '}
              {event.venue_name}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">{event.address}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/events/${event.id}/edit`}
              className={buttonClass({ variant: 'outline' })}
            >
              עריכת ההזמנה
            </Link>
            <Link
              href={`/admin/events/${event.id}/preview`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: 'outline' })}
            >
              תצוגה מקדימה להזמנה
            </Link>
            <Link href="/admin/plans" className={buttonClass({ variant: 'ghost' })}>
              מסלול ותשלום
            </Link>
          </div>
        </header>

        <section aria-labelledby="admin-event-summary" className="mt-8">
          <h2 id="admin-event-summary" className="sr-only">
            סיכום האירוע
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card padding="md">
              <p className="text-muted-foreground text-sm">מוזמנים פעילים</p>
              <p className="text-primary mt-2 text-3xl font-bold tabular-nums">
                {guestRows.length}
              </p>
            </Card>
            <Card padding="md">
              <p className="text-muted-foreground text-sm">תשובות שהתקבלו</p>
              <p className="text-primary mt-2 text-3xl font-bold tabular-nums">{rsvpRows.length}</p>
            </Card>
            <Card padding="md">
              <p className="text-muted-foreground text-sm">תשובות מגיעים</p>
              <p className="text-primary mt-2 text-3xl font-bold tabular-nums">
                {attendingReplies}
              </p>
            </Card>
            <Card padding="md">
              <p className="text-muted-foreground text-sm">סה״כ צפויים להגיע</p>
              <p className="text-primary mt-2 text-3xl font-bold tabular-nums">
                {expectedAttendees}
              </p>
            </Card>
          </div>
        </section>

        <section aria-labelledby="admin-guests" className="mt-10 space-y-6">
          <h2 id="admin-guests" className="sr-only">
            ניהול מוזמנים
          </h2>
          <PersonalInviteSendList guests={guestRows} />
          <GuestManagementPanel
            mode="admin"
            eventId={event.id}
            guests={guestRows}
            saved={saved}
            error={error}
            count={count}
          />
          <GuestFileImportForm mode="admin" eventId={event.id} />
        </section>

        <section aria-labelledby="admin-rsvps" className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-eyebrow text-accent-strong font-semibold">אישורי הגעה</p>
              <h2 id="admin-rsvps" className="text-h2 text-primary mt-2 font-bold">
                תשובות האורחים
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">{rsvpRows.length} תשובות</p>
          </div>

          {rsvpRows.length === 0 ? (
            <EmptyState
              className="mt-5"
              title="עדיין לא התקבלו תשובות"
              description="כאשר אורחים יאשרו הגעה, התשובות יופיעו כאן גם למנהל המערכת."
            />
          ) : (
            <ul className="mt-5 space-y-3">
              {rsvpRows.map((response) => (
                <li key={response.id}>
                  <Card padding="md">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-primary font-semibold">{response.full_name}</p>
                        <p className="text-muted-foreground mt-1 text-sm" dir="ltr">
                          {response.phone}
                        </p>
                      </div>
                      <Badge tone={attendanceTone(response.attendance_status)}>
                        {attendanceLabel(response.attendance_status)}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-3 text-sm">
                      מבוגרים: {response.adults_count} · ילדים: {response.children_count} · תינוקות:{' '}
                      {response.babies_count}
                    </p>
                    {(response.dietary_requirements !== null || response.notes !== null) && (
                      <p className="text-muted-foreground mt-2 text-sm">
                        {[response.dietary_requirements, response.notes]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </main>
  );
}
