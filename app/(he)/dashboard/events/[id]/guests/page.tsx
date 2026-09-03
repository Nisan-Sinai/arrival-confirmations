import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getEventLicense } from '@/app/_lib/eventLicenses';
import { getPlanDefinition, isMonetizedEvent } from '@/app/_lib/plans';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/layout';
import { GuestManagementPanel } from '@/features/admin/GuestManagementPanel';
import { PersonalInviteSendList } from '@/features/admin/PersonalInviteSendList';
import { PremiumToolsPanel } from '@/features/admin/PremiumToolsPanel';
import type { PremiumAttendanceStatus } from '@/lib/premiumWhatsApp';
import type { ProSeatingTable, TableShape } from '@/lib/proSeating';
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

// The select string is built at runtime (pro columns are added only for a Pro plan), so
// the typed client cannot infer the row shape from it. These describe what actually comes
// back; the pro-only fields are optional because the basic select omits them.
interface GuestRow {
  readonly id: string;
  readonly full_name: string;
  readonly phone: string;
  readonly email: string | null;
  readonly party_size: number;
  readonly table_name: string | null;
  readonly seat_number: string | null;
  readonly family_side: string | null;
  readonly notes: string | null;
  readonly checked_in_at: string | null;
  readonly invite_link_issued_at: string | null;
  readonly invite_first_opened_at: string | null;
  readonly invite_last_opened_at: string | null;
  readonly invite_open_count: number;
  readonly invite_last_response_at: string | null;
  readonly invite_last_response_status: PremiumAttendanceStatus;
  readonly table_id?: string | null;
  readonly seating_group?: string | null;
  readonly meal_preference?: string | null;
  readonly accessibility_needs?: string | null;
  readonly seating_priority?: number | null;
  readonly seat_locked?: boolean | null;
}

interface RsvpRow {
  readonly guest_id: string | null;
  readonly attendance_status: Exclude<PremiumAttendanceStatus, null>;
}

interface SeatingTableRow {
  readonly id: string;
  readonly name: string;
  readonly shape: TableShape;
  readonly capacity: number;
  readonly zone: string | null;
  readonly notes: string | null;
  readonly sort_order: number;
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
  const { data: event } = await guestDb
    .from('events')
    .select(
      'id, title, public_id, created_at, brand_primary_color, brand_accent_color, brand_logo_url, invitation_style',
    )
    .eq('id', id)
    .maybeSingle();
  if (event === null) notFound();

  // The advanced tools live on this page too, so the plan gate is decided here. A licensed
  // host (or a legacy free event) gets the live suite; everyone else gets it greyed and
  // inert, right under their own list — the product behind glass rather than a price list.
  const license = await getEventLicense(
    event.id,
    isMonetizedEvent(event.created_at) ? 'trial' : 'legacy',
  );
  const paidTools = license.plan === 'premium' || license.plan === 'pro';
  const toolsEnabled = license.plan === 'legacy' || (paidTools && license.status === 'active');
  const isPro = license.plan === 'pro' && license.status === 'active';
  // The live limit for a plan that is on; premium's number for the locked preview, so the
  // greyed card shows what the host would get rather than their trial's ten.
  const attendeeLimit = toolsEnabled
    ? license.plan === 'legacy'
      ? 5_000
      : (getPlanDefinition(license.plan)?.attendeeLimit ?? 1_000)
    : (getPlanDefinition('premium')?.attendeeLimit ?? 1_000);

  const baseGuestColumns =
    'id, full_name, phone, email, party_size, table_name, seat_number, family_side, notes, checked_in_at, invite_link_issued_at, invite_first_opened_at, invite_last_opened_at, invite_open_count, invite_last_response_at, invite_last_response_status';
  const guestColumns = isPro
    ? `${baseGuestColumns}, table_id, seating_group, meal_preference, accessibility_needs, seating_priority, seat_locked`
    : baseGuestColumns;

  const [{ data: guests, error: guestsError }, rsvpResult, tableResult, snapshotResult] =
    await Promise.all([
      guestDb
        .from('guests')
        .select(guestColumns)
        .eq('event_id', id)
        .eq('is_active', true)
        .order('full_name'),
      guestDb.from('rsvps').select('guest_id, attendance_status').eq('event_id', id),
      isPro
        ? guestDb
            .from('event_seating_tables')
            .select('id, name, shape, capacity, zone, notes, sort_order')
            .eq('event_id', id)
            .order('sort_order')
            .order('name')
        : Promise.resolve({ data: [] }),
      isPro
        ? guestDb
            .from('event_seating_snapshots')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', id)
        : Promise.resolve({ count: 0 }),
    ]);
  if (guestsError) throw new Error(`Guest list failed: ${guestsError.code}`);

  const guestList = (guests ?? []) as unknown as GuestRow[];
  const guestRows = guestList.map((guest) => ({
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

  const attendanceByGuest = new Map<string, PremiumAttendanceStatus>();
  for (const rsvp of (rsvpResult.data ?? []) as unknown as RsvpRow[]) {
    if (rsvp.guest_id !== null) attendanceByGuest.set(rsvp.guest_id, rsvp.attendance_status);
  }
  const premiumGuests = guestList.map((guest) => ({
    id: guest.id,
    fullName: guest.full_name,
    phone: guest.phone,
    partySize: guest.party_size,
    tableId: guest.table_id ?? null,
    tableName: guest.table_name,
    seatNumber: guest.seat_number,
    seatingGroup: guest.seating_group ?? null,
    familySide: guest.family_side,
    mealPreference: guest.meal_preference ?? null,
    accessibilityNeeds: guest.accessibility_needs ?? null,
    priority: guest.seating_priority ?? 0,
    seatLocked: guest.seat_locked ?? false,
    attendanceStatus: attendanceByGuest.get(guest.id) ?? null,
  }));
  const seatingTables: ProSeatingTable[] = (
    (tableResult.data ?? []) as unknown as SeatingTableRow[]
  ).map((table) => ({
    id: table.id,
    name: table.name,
    shape: table.shape,
    capacity: table.capacity,
    zone: table.zone,
    notes: table.notes,
    sortOrder: table.sort_order,
  }));
  const snapshotCount = 'count' in snapshotResult ? (snapshotResult.count ?? 0) : 0;

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
            <p className="text-eyebrow text-accent-strong font-semibold">מוזמנים וכלים מתקדמים</p>
            <h1 className="text-h1 text-primary mt-2 font-bold">{event.title}</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
              הוספה ועריכה ידנית, ייבוא אנשי קשר, שליחת קישורים אישיים ומעקב — ומתחת, כל הכלים
              המתקדמים: ייבוא מ-Excel, מרכז שליחה חכם ב-WhatsApp, מיתוג והושבה.
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
          <PremiumToolsPanel
            eventId={event.id}
            eventTitle={event.title}
            guests={premiumGuests}
            branding={{
              primaryColor: event.brand_primary_color,
              accentColor: event.brand_accent_color,
              logoUrl: event.brand_logo_url,
              invitationStyle: event.invitation_style,
            }}
            isPro={isPro}
            attendeeLimit={attendeeLimit}
            seatingTables={seatingTables}
            snapshotCount={snapshotCount}
            locked={!toolsEnabled}
          />
        </div>
      </Container>
    </main>
  );
}
