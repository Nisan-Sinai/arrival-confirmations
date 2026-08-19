import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';
import { getAppCopy } from '@/config/appCopy';
import { getEventTypePreset } from '@/config/eventTypes';
import { ResponseRateTile } from '@/features/admin/ResponseRateTile';
import { RsvpRow } from '@/features/admin/RsvpRow';
import { ShareInvitation } from '@/features/admin/ShareInvitation';
import { describeTimeUntilEvent, formatEventDate, formatEventWeekday } from '@/lib/eventDate';
import { localePath, type Locale } from '@/lib/i18n';
import { resolveRequestOrigin } from '@/lib/server/origin';
import { createUserClient } from '@/lib/server/supabase';
import { computeResponseRate, computeRsvpStats } from '@/services/rsvpStats';

function Stat({
  label,
  value,
  emphasis = false,
  hint,
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
  hint?: string;
}) {
  return (
    <Card
      variant={emphasis ? 'accent' : 'paper'}
      padding="none"
      className="flex flex-col justify-between p-4 sm:p-5"
    >
      <p className="text-muted-foreground text-xs sm:text-sm">{label}</p>
      <p
        className={
          emphasis
            ? 'text-primary mt-2 font-[family-name:var(--font-display)] text-4xl leading-none font-bold tabular-nums'
            : 'text-primary mt-2 font-[family-name:var(--font-display)] text-2xl leading-none font-bold tabular-nums'
        }
      >
        {value}
      </p>
      {hint !== undefined && <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>}
    </Card>
  );
}

export async function EventRsvpsPage({
  params,
  locale,
}: {
  readonly params: Promise<{ id: string }>;
  readonly locale: Locale;
}) {
  const copy = getAppCopy(locale).eventPage;
  const { id } = await params;
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect(localePath(locale, '/login'));

  const { data: event } = await supabase
    .from('events')
    .select(
      'id, public_id, title, event_type, event_date, venue_name, honoree_display_name, is_active, expected_guests',
    )
    .eq('id', id)
    .maybeSingle();
  if (event === null) notFound();

  const [{ data: rsvps }, { data: guests }] = await Promise.all([
    supabase
      .from('rsvps')
      .select('*')
      .eq('event_id', id)
      .order('submitted_at', { ascending: false }),
    supabase.from('guests').select('id, is_active, token_revoked_at').eq('event_id', id),
  ]);

  const rows = rsvps ?? [];
  const stats = computeRsvpStats(rows);
  const rate = computeResponseRate(guests ?? [], rows, event.expected_guests);
  const preset = getEventTypePreset(event.event_type, locale);
  const weekday = formatEventWeekday(event.event_date, locale);
  const date = formatEventDate(event.event_date, locale);
  const relative = describeTimeUntilEvent(event.event_date, new Date(), locale);

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="wide">
        <Link
          href={localePath(locale, '/dashboard')}
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
            <path d={locale === 'he' ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'} />
          </svg>
          {copy.allEvents}
        </Link>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-eyebrow text-accent-strong font-semibold">{preset.label}</p>
            <h1 className="text-h1 text-primary mt-2 font-bold">{event.title}</h1>
            <p className="text-muted-foreground mt-2">
              {locale === 'he' ? `יום ${weekday}` : weekday}, {date} · {event.venue_name}
              <span className="text-accent-strong"> · {relative}</span>
            </p>
          </div>
          <Link
            href={localePath(locale, `/dashboard/events/${event.id}/edit`)}
            className={buttonClass({ variant: 'outline' })}
          >
            {copy.editInvitation}
          </Link>
        </header>

        <div className="mt-9">
          <ShareInvitation
            publicId={event.public_id}
            origin={await resolveRequestOrigin()}
            blessingLine={preset.blessingLine}
            invitationLine={preset.invitationLine}
            honoree={event.honoree_display_name}
          />
        </div>

        <div className="mt-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={copy.expected} value={stats.expectedAttendees} emphasis hint={copy.expectedHint} />
          <Stat
            label={copy.repliesReceived}
            value={stats.total}
            emphasis
            hint={`${stats.receivedToday} ${copy.todaySuffix}`}
          />
          <Stat label={copy.attending} value={stats.attending} />
          <Stat label={copy.notAttending} value={stats.notAttending} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={copy.maybe} value={stats.maybe} />
          <Stat label={copy.adults} value={stats.adults} />
          <Stat label={copy.children} value={stats.children} />
          <ResponseRateTile
            eventId={event.id}
            percentage={rate.percentage}
            invited={rate.invited}
            expectedGuests={event.expected_guests}
          />
        </div>

        <section aria-labelledby="replies" className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="replies" className="text-h2 text-primary font-bold">
              {copy.replies}
            </h2>
            {rows.length > 0 && (
              <p className="text-muted-foreground text-sm">
                {stats.babies > 0 &&
                  `${copy.babiesPrefix} ${stats.babies} ${copy.babiesSuffix} · `}
                {copy.countLegend}
              </p>
            )}
          </div>

          {rows.length === 0 ? (
            <EmptyState
              className="mt-5"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-6"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9.5" cy="7" r="4" />
                  <path d="M19 8v6M22 11h-6" />
                </svg>
              }
              title={copy.emptyTitle}
              description={event.is_active ? copy.emptyPublished : copy.emptyDraft}
              action={
                event.is_active ? undefined : (
                  <Link
                    href={localePath(locale, `/dashboard/events/${event.id}/edit`)}
                    className={buttonClass({ size: 'lg' })}
                  >
                    {copy.publishInvitation}
                  </Link>
                )
              }
            />
          ) : (
            <>
              <div
                aria-hidden="true"
                className="text-muted-foreground mt-5 hidden grid-cols-[1.4fr_1.1fr_0.8fr_0.9fr_1.5fr_auto] gap-4 border-b px-3 pb-2.5 text-xs font-semibold lg:grid"
              >
                {copy.columns.map((column, index) => (
                  <span key={column} className={index === 5 ? 'w-20 text-end' : undefined}>
                    {column}
                  </span>
                ))}
              </div>
              <ul className="mt-3 space-y-3 lg:mt-0 lg:space-y-0">
                {rows.map((rsvp) => (
                  <RsvpRow key={rsvp.id} rsvp={rsvp} eventId={event.id} />
                ))}
              </ul>
            </>
          )}
        </section>
      </Container>
    </main>
  );
}
