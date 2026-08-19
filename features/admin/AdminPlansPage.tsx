import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getEventLicenses, trialEventLicense } from '@/app/_lib/eventLicenses';
import {
  formatPlanPrice,
  getPaymentMethodLabels,
  getPlanDefinition,
  getPlanLabel,
  isMonetizedEvent,
  type PlanCode,
} from '@/app/_lib/plans';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';
import { ActivatePlanForm } from '@/features/admin/ActivatePlanForm';
import { DeactivatePlanButton } from '@/features/admin/DeactivatePlanButton';
import { localePath, type Locale } from '@/lib/i18n';
import { createPrivilegedClient } from '@/lib/server/supabase';

const COPY = {
  he: {
    eyebrow: 'ניהול מערכת',
    title: 'מסלולים ותשלומים',
    intro: 'לקוחות יוצרים אירוע בחינם. אירועים חדשים מתחילים במצב בדיקה, והמנהל מפעיל מסלול לאחר קבלת תשלום.',
    existing: 'אירוע קיים',
    events: (count: number) => `${count} אירועים`,
    date: 'תאריך',
    event: 'אירוע',
    owner: 'לקוח',
    payment: 'תשלום',
    reference: 'אסמכתא',
    open: 'פתיחת האירוע',
    noPayment: 'טרם נרשם תשלום',
    active: 'פעיל',
    trial: 'בדיקה',
    pending: 'ממתין לתשלום',
    cancelled: 'מבוטל',
    refunded: 'הוחזר',
    legacy: 'ללא חיוב',
  },
  en: {
    eyebrow: 'Platform admin',
    title: 'Plans & payments',
    intro: 'Customers create an event for free. New events start in trial mode, and an admin activates a plan after payment is received.',
    existing: 'Existing event',
    events: (count: number) => `${count} events`,
    date: 'Date',
    event: 'Event',
    owner: 'Customer',
    payment: 'Payment',
    reference: 'Reference',
    open: 'Open event',
    noPayment: 'No payment recorded yet',
    active: 'Active',
    trial: 'Trial',
    pending: 'Pending payment',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    legacy: 'No charge',
  },
} as const;

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'gold' | 'neutral' {
  if (status === 'active' || status === 'legacy') return 'success';
  if (status === 'trial') return 'gold';
  if (status === 'pending_payment') return 'warning';
  if (status === 'cancelled' || status === 'refunded') return 'danger';
  return 'neutral';
}

export async function AdminPlansPage({ locale }: { readonly locale: Locale }) {
  const copy = COPY[locale];
  const paymentLabels = getPaymentMethodLabels(locale);
  const db = createPrivilegedClient() as unknown as SupabaseClient;
  const { data, error } = await db
    .from('events')
    .select('id, owner_user_id, title, event_date, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Admin billing events query failed: ${error.code}`);

  const rows = (data ?? []) as Array<{
    id: string;
    owner_user_id: string;
    title: string;
    event_date: string;
    created_at: string;
  }>;
  const licenses = await getEventLicenses(rows.map((event) => event.id));
  for (const event of rows) {
    const current = licenses.get(event.id);
    if (current?.changedAt === null && isMonetizedEvent(event.created_at)) {
      licenses.set(event.id, trialEventLicense(event.id));
    }
  }

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="wide">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow text-accent-strong font-semibold">{copy.eyebrow}</p>
            <h1 className="text-h1 text-primary mt-2 font-bold">{copy.title}</h1>
            <p className="text-muted-foreground mt-3 max-w-3xl leading-relaxed">{copy.intro}</p>
          </div>
          <p className="text-muted-foreground text-sm">{copy.events(rows.length)}</p>
        </div>

        <div className="mt-8 space-y-4">
          {rows.map((event) => {
            const license = licenses.get(event.id);
            const plan = (license?.plan ?? 'legacy') as PlanCode;
            const status = license?.status ?? 'legacy';
            const definition = getPlanDefinition(plan, locale);
            const statusLabel =
              status === 'active'
                ? copy.active
                : status === 'trial'
                  ? copy.trial
                  : status === 'pending_payment'
                    ? copy.pending
                    : status === 'cancelled'
                      ? copy.cancelled
                      : status === 'refunded'
                        ? copy.refunded
                        : copy.legacy;
            const paid = license?.paymentMethod ?? null;
            return (
              <Card key={event.id} padding="md">
                <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr_1fr_1.2fr] xl:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-h3 text-primary font-semibold">{event.title}</h2>
                      <Badge tone={statusTone(status)}>{statusLabel}</Badge>
                      <Badge tone="outline">{getPlanLabel(plan, locale)}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {copy.date}: {event.event_date}
                    </p>
                    <p className="text-muted-foreground mt-1 truncate text-xs" dir="ltr">
                      {copy.owner}: {event.owner_user_id}
                    </p>
                    <Link
                      href={localePath(locale, `/admin/events/${event.id}`)}
                      className={`${buttonClass({ variant: 'ghost', size: 'sm' })} mt-3`}
                    >
                      {copy.open}
                    </Link>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-sm">{copy.plan}</p>
                    <p className="text-primary mt-1 font-semibold">
                      {definition === null ? copy.existing : definition.name}
                    </p>
                    {definition !== null && (
                      <p className="text-muted-foreground mt-1 text-sm">
                        {formatPlanPrice(definition.priceAgorot, locale)} · {definition.attendeeLimit.toLocaleString(locale === 'he' ? 'he-IL' : 'en-US')}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-muted-foreground text-sm">{copy.payment}</p>
                    <p className="text-primary mt-1 font-semibold">
                      {paid === null ? copy.noPayment : paymentLabels[paid]}
                    </p>
                    {license?.paymentReference !== null && license?.paymentReference !== undefined && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {copy.reference}: {license.paymentReference}
                      </p>
                    )}
                  </div>

                  <div>
                    {status === 'active' && plan !== 'legacy' ? (
                      <DeactivatePlanButton eventId={event.id} />
                    ) : plan === 'legacy' ? (
                      <Badge tone="success">{copy.legacy}</Badge>
                    ) : (
                      <ActivatePlanForm eventId={event.id} />
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </main>
  );
}
