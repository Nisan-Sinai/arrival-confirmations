import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/layout';
import { getAppCopy } from '@/config/appCopy';
import { GuestManagementPanel } from '@/features/admin/GuestManagementPanel';
import { PersonalInviteSendList } from '@/features/admin/PersonalInviteSendList';
import { localePath, type Locale } from '@/lib/i18n';
import { createUserClient } from '@/lib/server/supabase';

export interface GuestsPageProps {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{ saved?: string; error?: string; count?: string }>;
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

export async function GuestsPage({
  params,
  searchParams,
  locale,
}: GuestsPageProps & { readonly locale: Locale }) {
  const copy = getAppCopy(locale).guestsPage;
  const { id } = await params;
  const { saved = '', error = '', count = '' } = await searchParams;
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect(localePath(locale, '/login'));

  const guestDb = supabase as unknown as SupabaseClient;
  const [{ data: event }, { data: guests, error: guestsError }] = await Promise.all([
    guestDb.from('events').select('id, title, public_id').eq('id', id).maybeSingle(),
    guestDb
      .from('guests')
      .select(
        'id, full_name, phone, email, party_size, table_name, seat_number, notes, invite_link_issued_at, invite_first_opened_at, invite_last_opened_at, invite_open_count, invite_last_response_at, invite_last_response_status',
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
    inviteLinkIssuedAt: guest.invite_link_issued_at,
    inviteFirstOpenedAt: guest.invite_first_opened_at,
    inviteLastOpenedAt: guest.invite_last_opened_at,
    inviteOpenCount: guest.invite_open_count,
    inviteLastResponseAt: guest.invite_last_response_at,
    inviteLastResponseStatus: guest.invite_last_response_status,
  }));
  const totalPeople = guestRows.reduce((sum, guest) => sum + guest.partySize, 0);
  const openedInvites = guestRows.filter((guest) => guest.inviteOpenCount > 0).length;
  const answeredInvites = guestRows.filter((guest) => guest.inviteLastResponseStatus !== null).length;

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="wide">
        <Link
          href={localePath(locale, `/dashboard/events/${id}`)}
          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 rounded-sm text-sm"
        >
          {copy.back}
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow text-accent-strong font-semibold">{copy.eyebrow}</p>
            <h1 className="text-h1 text-primary mt-2 font-bold">{event.title}</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">{copy.intro}</p>
          </div>
          <Link
            href={localePath(locale, `/e/${event.public_id}`)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: 'outline' })}
          >
            {copy.preview}
          </Link>
        </div>

        <section
          aria-label={copy.summaryAria}
          className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <SummaryCard label={copy.records} value={guestRows.length} hint={copy.recordsHint} />
          <SummaryCard label={copy.people} value={totalPeople} hint={copy.peopleHint} />
          <SummaryCard label={copy.opened} value={openedInvites} hint={copy.openedHint} />
          <SummaryCard label={copy.answered} value={answeredInvites} hint={copy.answeredHint} />
        </section>

        <div className="mt-8 space-y-6">
          <GuestManagementPanel
            mode="owner"
            eventId={event.id}
            guests={guestRows}
            saved={saved}
            error={error}
            count={count}
          />
          <PersonalInviteSendList guests={guestRows} locale={locale} />
        </div>
      </Container>
    </main>
  );
}
