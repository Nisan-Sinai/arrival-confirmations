import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getEventLicense } from '@/app/_lib/eventLicenses';
import { getPlanDefinition, isMonetizedEvent } from '@/app/_lib/plans';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/layout';
import { PremiumToolsPanel } from '@/features/admin/PremiumToolsPanel';
import type { ProSeatingTable, TableShape } from '@/lib/proSeating';
import type { PremiumAttendanceStatus } from '@/lib/premiumWhatsApp';
import { resolveRequestOrigin } from '@/lib/server/origin';
import { createUserClient } from '@/lib/server/supabase';

export const metadata: Metadata = {
  title: 'כלים מתקדמים לאירוע',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface EventToolsRow {
  readonly id: string;
  readonly public_id: string;
  readonly title: string;
  readonly created_at: string;
  readonly brand_primary_color: string;
  readonly brand_accent_color: string;
  readonly brand_logo_url: string | null;
  readonly invitation_style: string;
}

interface GuestToolsRow {
  readonly id: string;
  readonly full_name: string;
  readonly phone: string;
  readonly party_size: number;
  readonly table_id: string | null;
  readonly table_name: string | null;
  readonly seat_number: string | null;
  readonly seating_group: string | null;
  readonly family_side: string | null;
  readonly meal_preference: string | null;
  readonly accessibility_needs: string | null;
  readonly seating_priority: number;
  readonly seat_locked: boolean;
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

interface RsvpToolsRow {
  readonly guest_id: string | null;
  readonly attendance_status: Exclude<PremiumAttendanceStatus, null>;
}

export default async function EventToolsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect('/login');

  const db = supabase as unknown as SupabaseClient;
  const { data: rawEvent } = await db
    .from('events')
    .select(
      'id, public_id, title, created_at, brand_primary_color, brand_accent_color, brand_logo_url, invitation_style',
    )
    .eq('id', id)
    .maybeSingle();
  if (rawEvent === null) notFound();

  const event = rawEvent as EventToolsRow;
  const license = await getEventLicense(
    event.id,
    isMonetizedEvent(event.created_at) ? 'trial' : 'legacy',
  );
  const paidTools = license.plan === 'premium' || license.plan === 'pro';
  const enabled = license.plan === 'legacy' || (paidTools && license.status === 'active');
  const isPro = license.plan === 'pro' && license.status === 'active';
  const attendeeLimit =
    license.plan === 'legacy' ? 5_000 : (getPlanDefinition(license.plan)?.attendeeLimit ?? 1_000);

  const guestColumns = isPro
    ? 'id, full_name, phone, party_size, table_id, table_name, seat_number, seating_group, family_side, meal_preference, accessibility_needs, seating_priority, seat_locked'
    : 'id, full_name, phone, party_size, table_name, seat_number, family_side';

  const guestQuery = db
    .from('guests')
    .select(guestColumns)
    .eq('event_id', id)
    .eq('is_active', true)
    .order('full_name');
  const rsvpQuery = db.from('rsvps').select('guest_id, attendance_status').eq('event_id', id);
  const tableQuery = isPro
    ? db
        .from('event_seating_tables')
        .select('id, name, shape, capacity, zone, notes, sort_order')
        .eq('event_id', id)
        .order('sort_order')
        .order('name')
    : Promise.resolve({ data: [] });
  const snapshotQuery = isPro
    ? db
        .from('event_seating_snapshots')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', id)
    : Promise.resolve({ count: 0 });

  const [guestResult, rsvpResult, tableResult, snapshotResult] = await Promise.all([
    guestQuery,
    rsvpQuery,
    tableQuery,
    snapshotQuery,
  ]);

  const guests = (guestResult.data ?? []) as unknown as GuestToolsRow[];
  const attendanceByGuest = new Map<string, PremiumAttendanceStatus>();
  for (const rsvp of (rsvpResult.data ?? []) as RsvpToolsRow[]) {
    if (rsvp.guest_id !== null) attendanceByGuest.set(rsvp.guest_id, rsvp.attendance_status);
  }
  const seatingTables: ProSeatingTable[] = ((tableResult.data ?? []) as SeatingTableRow[]).map(
    (table) => ({
      id: table.id,
      name: table.name,
      shape: table.shape,
      capacity: table.capacity,
      zone: table.zone,
      notes: table.notes,
      sortOrder: table.sort_order,
    }),
  );
  const snapshotCount = 'count' in snapshotResult ? (snapshotResult.count ?? 0) : 0;
  const inviteUrl = `${await resolveRequestOrigin()}/e/${event.public_id}`;

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="wide">
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
          <p className="text-eyebrow text-accent-strong font-semibold">
            {isPro ? 'Pro · הפקה והושבה' : 'Premium'}
          </p>
          <h1 className="text-h1 text-primary mt-2 font-bold">כלים מתקדמים · {event.title}</h1>
          <p className="text-muted-foreground mt-3 max-w-3xl leading-relaxed">
            {isPro
              ? 'ניהול מוזמנים ושליחה אישית, מיתוג, שולחנות עם קיבולת ואזורים, הושבה חכמה, קבוצות, נגישות, דוחות, ייצוא ונקודות שחזור — מחוברים לנתוני האירוע האמיתיים.'
              : 'יבוא מוזמנים מ-Excel, מרכז שליחה חכם מה-WhatsApp האישי, מעקב התקדמות, מיתוג מתקדם וניהול הושבה — מחוברים לנתוני האירוע האמיתיים במקום אחד.'}
          </p>
        </div>

        {!enabled ? (
          <Card padding="lg" className="mt-8">
            <h2 className="text-h2 text-primary font-bold">נדרש מסלול Premium או Pro פעיל</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              האירוע נשאר זמין לניהול אישורי הגעה. הכלים המתקדמים נפתחים לאחר הפעלת מסלול מתאים
              לאירוע.
            </p>
            <Link href="/pricing" className={`${buttonClass({ size: 'lg' })} mt-6`}>
              צפייה במסלולים
            </Link>
          </Card>
        ) : (
          <div className="mt-8">
            <PremiumToolsPanel
              eventId={event.id}
              eventTitle={event.title}
              inviteUrl={inviteUrl}
              guests={guests.map((guest) => ({
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
              }))}
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
            />
          </div>
        )}
      </Container>
    </main>
  );
}
