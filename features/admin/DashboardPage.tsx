import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getEventLicenses, trialEventLicense } from '@/app/_lib/eventLicenses';
import { getPlanCatalog, isMonetizedEvent, type PlanCode } from '@/app/_lib/plans';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';
import { getAppCopy } from '@/config/appCopy';
import { appConfig } from '@/config/event.config';
import { getEventTypePreset } from '@/config/eventTypes';
import { EventManagementActions } from '@/features/admin/EventManagementActions';
import { describeTimeUntilEvent, formatEventDate, formatEventWeekday } from '@/lib/eventDate';
import { localePath, type Locale } from '@/lib/i18n';
import { resolveRequestOrigin } from '@/lib/server/origin';
import { createUserClient } from '@/lib/server/supabase';

function whatsappPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
}

function licenseTone(status: string): 'success' | 'warning' | 'danger' | 'gold' | 'neutral' {
  if (status === 'active' || status === 'legacy') return 'success';
  if (status === 'trial') return 'gold';
  if (status === 'pending_payment') return 'warning';
  if (status === 'cancelled' || status === 'refunded') return 'danger';
  return 'neutral';
}

function planLabel(plan: PlanCode, locale: Locale): string {
  if (plan === 'legacy') return locale === 'he' ? 'אירוע קיים — ללא חיוב' : 'Existing event — no charge';
  return getPlanCatalog(locale).find((entry) => entry.code === plan)?.name ?? plan;
}

export async function DashboardPage({ locale }: { readonly locale: Locale }) {
  const copy = getAppCopy(locale).dashboard;
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) redirect(localePath(locale, '/login'));

  const { data: events } = await supabase
    .from('events')
    .select('id, public_id, title, event_type, event_date, venue_name, is_active, created_at')
    .order('event_date', { ascending: true });

  const rows = events ?? [];
  const licenses = await getEventLicenses(rows.map((event) => event.id));
  for (const event of rows) {
    const current = licenses.get(event.id);
    if (current?.changedAt === null && isMonetizedEvent(event.created_at)) {
      licenses.set(event.id, trialEventLicense(event.id));
    }
  }

  const origin = await resolveRequestOrigin();
  const whatsappUrl = `https://wa.me/${whatsappPhone(appConfig.supportPhone)}?text=${encodeURIComponent(
    copy.activationWhatsApp,
  )}`;

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="app">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow text-accent-strong font-semibold">{copy.eyebrow}</p>
            <h1 className="text-h1 text-primary mt-2 font-bold">{copy.title}</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl leading-relaxed">{copy.intro}</p>
          </div>
          {rows.length > 0 && (
            <p className="text-muted-foreground text-sm">
              {rows.length === 1 ? copy.oneEvent : `${rows.length} ${copy.eventsSuffix}`}
            </p>
          )}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            className="mt-10"
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
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18M12 14v4M10 16h4" />
              </svg>
            }
            title={copy.emptyTitle}
            description={copy.emptyBody}
            action={
              <Link href={localePath(locale, '/dashboard/events/new')} className={buttonClass({ size: 'lg' })}>
                {copy.emptyAction}
              </Link>
            }
          />
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {rows.map((event) => {
              const license = licenses.get(event.id);
              const plan = license?.plan ?? 'legacy';
              const status = license?.status ?? 'legacy';
              const needsActivation = status === 'trial' || status === 'pending_payment';
              const licenseCopy = copy.license;
              const statusLabel =
                status === 'active'
                  ? licenseCopy.active
                  : status === 'trial'
                    ? licenseCopy.trial
                    : status === 'pending_payment'
                      ? licenseCopy.pending_payment
                      : status === 'cancelled'
                        ? licenseCopy.cancelled
                        : status === 'refunded'
                          ? licenseCopy.refunded
                          : licenseCopy.legacy;

              return (
                <li key={event.id}>
                  <Card interactive padding="md" className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-h3 text-primary font-semibold">
                          <Link
                            href={localePath(locale, `/dashboard/events/${event.id}`)}
                            className="rounded-sm underline-offset-4 hover:underline"
                          >
                            {event.title}
                          </Link>
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {getEventTypePreset(event.event_type, locale).label}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge tone={event.is_active ? 'success' : 'warning'}>
                          {event.is_active ? copy.published : copy.draft}
                        </Badge>
                        <Badge tone={licenseTone(status)}>
                          {planLabel(plan, locale)} · {statusLabel}
                        </Badge>
                      </div>
                    </div>

                    <dl className="mt-5 space-y-1.5 text-sm">
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">{copy.when}</dt>
                        <dd className="text-foreground font-medium">
                          {formatEventWeekday(event.event_date, locale)}, {formatEventDate(event.event_date, locale)}
                          <span className="text-muted-foreground font-normal">
                            {' · '}
                            {describeTimeUntilEvent(event.event_date, new Date(), locale)}
                          </span>
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">{copy.where}</dt>
                        <dd className="text-foreground font-medium">{event.venue_name}</dd>
                      </div>
                    </dl>

                    {needsActivation && (
                      <div className="border-accent-strong/25 bg-warning-soft mt-5 rounded-xl border p-4 text-sm">
                        <p className="text-accent-foreground font-semibold">
                          {status === 'trial' ? copy.trialTitle : copy.pendingTitle}
                        </p>
                        <p className="text-muted-foreground mt-1 leading-relaxed">{copy.activationBody}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            href={localePath(locale, '/pricing')}
                            className={buttonClass({ variant: 'outline', size: 'sm' })}
                          >
                            {copy.comparePlans}
                          </Link>
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonClass({ size: 'sm' })}
                          >
                            {copy.activateWhatsApp}
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="mt-auto">
                      <EventManagementActions
                        eventId={event.id}
                        eventTitle={event.title}
                        publicId={event.public_id}
                        origin={origin}
                      />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </main>
  );
}
