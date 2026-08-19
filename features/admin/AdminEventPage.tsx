import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getEventLicense } from '@/app/_lib/eventLicenses';
import { getPlanLabel, isMonetizedEvent } from '@/app/_lib/plans';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';
import { getEventTypePreset } from '@/config/eventTypes';
import { GuestFileImportForm } from '@/features/admin/GuestFileImportForm';
import { GuestManagementPanel } from '@/features/admin/GuestManagementPanel';
import { PersonalInviteSendList } from '@/features/admin/PersonalInviteSendList';
import { formatEventDate, formatEventWeekday } from '@/lib/eventDate';
import { localePath, type Locale } from '@/lib/i18n';
import { createPrivilegedClient } from '@/lib/server/supabase';
import { computeRsvpStats } from '@/services/rsvpStats';

const COPY = {
  he: {
    back: 'כל אירועי הלקוחות',
    eyebrow: 'אירוע לקוח',
    edit: 'עריכת האירוע',
    preview: 'תצוגה מקדימה',
    published: 'מפורסם',
    draft: 'טיוטה',
    date: 'תאריך',
    venue: 'מקום',
    owner: 'מזהה לקוח',
    plan: 'מסלול',
    rsvps: 'אישורי הגעה',
    replies: 'תשובות',
    attending: 'מגיעים',
    maybe: 'אולי',
    notAttending: 'לא מגיעים',
    expected: 'צפי משתתפים',
    guests: 'מוזמנים פעילים',
    people: 'אנשים ברשימה',
    guestManagement: 'ניהול מוזמנים',
    guestIntro: 'הוספה, עריכה, מחיקה וייבוא בשם הלקוח. השינויים מופיעים מיד באזור הלקוח ובקישורים האישיים.',
  },
  en: {
    back: 'All customer events',
    eyebrow: 'Customer event',
    edit: 'Edit event',
    preview: 'Preview',
    published: 'Published',
    draft: 'Draft',
    date: 'Date',
    venue: 'Venue',
    owner: 'Customer ID',
    plan: 'Plan',
    rsvps: 'RSVPs',
    replies: 'Replies',
    attending: 'Attending',
    maybe: 'Maybe',
    notAttending: 'Not attending',
    expected: 'Expected attendees',
    guests: 'Active guests',
    people: 'People on guest list',
    guestManagement: 'Guest management',
    guestIntro: 'Add, edit, delete and import on behalf of the customer. Changes appear immediately in the customer area and personal links.',
  },
} as const;

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card padding="md">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-primary mt-2 text-3xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

export interface AdminEventPageProps {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{ saved?: string; error?: string; count?: string }>;
}

export async function AdminEventPage({
  params,
  searchParams,
  locale,
}: AdminEventPageProps & { readonly locale: Locale }) {
  const copy = COPY[locale];
  const { id } = await params;
  const { saved = '', error = '', count = '' } = await searchParams;
  const db = createPrivilegedClient() as unknown as SupabaseClient;

  const [{ data: event }, { data: guests, error: guestsError }, { data: rsvps, error: rsvpError }] =
    await Promise.all([
      db
        .from('events')
        .select(
          'id, public_id, owner_user_id, title, event_type, event_date, venue_name, is_active, expected_guests, created_at',
        )
        .eq('id', id)
        .maybeSingle(),
      db
        .from('guests')
        .select(
          'id, full_name, phone, email, party_size, table_name, seat_number, notes, invite_link_issued_at, invite_first_opened_at, invite_last_opened_at, invite_open_count, invite_last_response_at, invite_last_response_status',
        )
        .eq('event_id', id)
        .eq('is_active', true)
        .order('full_name'),
      db.from('rsvps').select('*').eq('event_id', id).order('submitted_at', { ascending: false }),
    ]);

  if (event === null) notFound();
  if (guestsError) throw new Error(`Admin guest list failed: ${guestsError.code}`);
  if (rsvpError) throw new Error(`Admin RSVP list failed: ${rsvpError.code}`);

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
  const stats = computeRsvpStats(rsvps ?? []);
  const totalPeople = guestRows.reduce((sum, guest) => sum + guest.partySize, 0);
  const license = await getEventLicense(
    event.id,
    isMonetizedEvent(event.created_at) ? 'trial' : 'legacy',
  );
  const preset = getEventTypePreset(event.event_type, locale);

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="wide">
        <Link
          href={localePath(locale, '/admin/events')}
          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 rounded-sm text-sm"
        >
          {copy.back}
        </Link>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-eyebrow text-accent-strong font-semibold">{copy.eyebrow}</p>
              <Badge tone={event.is_active ? 'success' : 'warning'}>
                {event.is_active ? copy.published : copy.draft}
              </Badge>
            </div>
            <h1 className="text-h1 text-primary mt-2 font-bold">{event.title}</h1>
            <p className="text-muted-foreground mt-2">
              {preset.label} · {formatEventWeekday(event.event_date, locale)}, {formatEventDate(event.event_date, locale)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={localePath(locale, `/admin/events/${event.id}/edit`)}
              className={buttonClass({ variant: 'outline' })}
            >
              {copy.edit}
            </Link>
            <Link
              href={localePath(locale, `/admin/events/${event.id}/preview`)}
              className={buttonClass()}
            >
              {copy.preview}
            </Link>
          </div>
        </header>

        <dl className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card padding="md">
            <dt className="text-muted-foreground text-sm">{copy.venue}</dt>
            <dd className="text-primary mt-2 font-semibold">{event.venue_name}</dd>
          </Card>
          <Card padding="md">
            <dt className="text-muted-foreground text-sm">{copy.owner}</dt>
            <dd className="text-primary mt-2 truncate font-semibold" dir="ltr">{event.owner_user_id}</dd>
          </Card>
          <Card padding="md">
            <dt className="text-muted-foreground text-sm">{copy.plan}</dt>
            <dd className="text-primary mt-2 font-semibold">{getPlanLabel(license.plan, locale)}</dd>
          </Card>
          <Card padding="md">
            <dt className="text-muted-foreground text-sm">{copy.expected}</dt>
            <dd className="text-primary mt-2 font-semibold tabular-nums">{event.expected_guests ?? 0}</dd>
          </Card>
        </dl>

        <section aria-label={copy.rsvps} className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label={copy.replies} value={stats.total} />
          <Metric label={copy.attending} value={stats.attending} />
          <Metric label={copy.maybe} value={stats.maybe} />
          <Metric label={copy.notAttending} value={stats.notAttending} />
        </section>

        <section className="mt-10" aria-labelledby="admin-guest-management">
          <h2 id="admin-guest-management" className="text-h2 text-primary font-bold">{copy.guestManagement}</h2>
          <p className="text-muted-foreground mt-2 max-w-3xl leading-relaxed">{copy.guestIntro}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
            <Metric label={copy.guests} value={guestRows.length} />
            <Metric label={copy.people} value={totalPeople} />
          </div>
          <div className="mt-6 space-y-6">
            <GuestManagementPanel
              mode="admin"
              eventId={event.id}
              guests={guestRows}
              saved={saved}
              error={error}
              count={count}
            />
            <GuestFileImportForm eventId={event.id} />
            <PersonalInviteSendList guests={guestRows} locale={locale} />
          </div>
        </section>
      </Container>
    </main>
  );
}
