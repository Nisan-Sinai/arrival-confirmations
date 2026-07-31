import type { Metadata } from 'next';

import { updateEventLicenseAction } from '@/app/actions/manageLicense';
import { getEventLicenses } from '@/app/_lib/eventLicenses';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PLAN_CATALOG,
  formatPlanPrice,
  getPlanDefinition,
  getPlanLabel,
  type LicenseStatus,
} from '@/app/_lib/plans';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Container } from '@/components/ui/layout';
import { createPrivilegedClient } from '@/lib/server/supabase';

export const metadata: Metadata = {
  title: 'ניהול מסלולים ותשלומים',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const fieldClass =
  'border-border-strong bg-background text-foreground min-h-11 w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring]';

function statusLabel(status: string): string {
  if (status === 'trial') return 'בדיקה';
  if (status === 'pending_payment') return 'ממתין לתשלום';
  if (status === 'active') return 'פעיל';
  if (status === 'cancelled') return 'בוטל';
  if (status === 'refunded') return 'הוחזר';
  return 'אירוע קיים';
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'gold' {
  if (status === 'active' || status === 'legacy') return 'success';
  if (status === 'trial') return 'gold';
  if (status === 'pending_payment') return 'warning';
  if (status === 'cancelled' || status === 'refunded') return 'danger';
  return 'neutral';
}

interface AdminPlansPageProps {
  readonly searchParams: Promise<{ q?: string }>;
}

export default async function AdminPlansPage({ searchParams }: AdminPlansPageProps) {
  const { q = '' } = await searchParams;
  const query = q.trim().toLowerCase();
  const privileged = createPrivilegedClient();

  const [{ data: events, error }, { data: usersData }] = await Promise.all([
    privileged
      .from('events')
      .select('id, owner_user_id, title, event_date, contact_phone, public_id, is_active')
      .order('created_at', { ascending: false }),
    privileged.auth.admin.listUsers({ page: 1, perPage: 1_000 }),
  ]);

  if (error) throw new Error(`admin event list failed: ${error.code}`);

  const ownerEmails = new Map(
    (usersData?.users ?? []).map((user) => [user.id, user.email ?? 'ללא אימייל'] as const),
  );
  const eventRows = events ?? [];
  const licenses = await getEventLicenses(eventRows.map((event) => event.id));

  const filtered = eventRows.filter((event) => {
    if (query === '') return true;
    const ownerEmail = event.owner_user_id === null ? '' : ownerEmails.get(event.owner_user_id) ?? '';
    return [event.id, event.public_id, event.title, event.contact_phone ?? '', ownerEmail]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  return (
    <main id="main" className="flex-1 py-10 sm:py-14">
      <Container width="wide">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow text-accent-strong font-semibold">ניהול ידני</p>
            <h1 className="text-h1 text-primary mt-2 font-bold">מסלולים ותשלומים</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
              לאחר קבלת תשלום בטלפון, ב-Bit או בהעברה, בוחרים מסלול ומפעילים אותו לאירוע.
              כל שינוי נשמר ביומן פעולות בלתי מחיק.
            </p>
          </div>
          <Badge tone="outline">{eventRows.length} אירועים במערכת</Badge>
        </div>

        <form role="search" className="mt-8 flex max-w-2xl gap-3">
          <label className="sr-only" htmlFor="admin-event-search">
            חיפוש אירוע
          </label>
          <input
            id="admin-event-search"
            name="q"
            defaultValue={q}
            placeholder="שם אירוע, אימייל, טלפון או מזהה"
            className={fieldClass}
          />
          <Button type="submit" variant="outline">
            חיפוש
          </Button>
        </form>

        {filtered.length === 0 ? (
          <EmptyState
            className="mt-10"
            title="לא נמצאו אירועים"
            description="נסו לחפש לפי שם האירוע, כתובת האימייל, הטלפון או המזהה."
          />
        ) : (
          <ul className="mt-10 space-y-5">
            {filtered.map((event) => {
              const license = licenses.get(event.id);
              const currentPlan = license?.plan ?? 'legacy';
              const currentStatus = license?.status ?? 'legacy';
              const formPlan = currentPlan === 'legacy' ? 'basic' : currentPlan;
              const defaultPrice =
                license?.priceAgorot ?? getPlanDefinition(formPlan)?.priceAgorot ?? 0;
              const ownerEmail =
                event.owner_user_id === null
                  ? 'ללא בעלים'
                  : ownerEmails.get(event.owner_user_id) ?? event.owner_user_id;

              return (
                <li key={event.id}>
                  <Card padding="lg">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-h3 text-primary font-semibold">{event.title}</h2>
                        <p className="text-muted-foreground mt-1 text-sm" dir="ltr">
                          {ownerEmail}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {event.event_date} · {event.contact_phone ?? 'ללא טלפון'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={currentPlan === 'premium' ? 'gold' : 'neutral'}>
                          {getPlanLabel(currentPlan)}
                        </Badge>
                        <Badge tone={statusTone(currentStatus)}>{statusLabel(currentStatus)}</Badge>
                        <Badge tone={event.is_active ? 'success' : 'warning'}>
                          {event.is_active ? 'הזמנה מפורסמת' : 'טיוטה'}
                        </Badge>
                      </div>
                    </div>

                    <dl className="border-border mt-5 grid gap-3 border-y py-4 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-muted-foreground">מזהה אירוע</dt>
                        <dd className="text-foreground mt-1 font-mono text-xs" dir="ltr">
                          {event.id}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">סכום מתועד</dt>
                        <dd className="text-foreground mt-1 font-semibold">
                          {formatPlanPrice(license?.priceAgorot ?? 0)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">עודכן לאחרונה</dt>
                        <dd className="text-foreground mt-1">
                          {license?.changedAt === null || license?.changedAt === undefined
                            ? 'לא הופעל ידנית'
                            : new Intl.DateTimeFormat('he-IL', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              }).format(new Date(license.changedAt))}
                        </dd>
                      </div>
                    </dl>

                    <form action={updateEventLicenseAction} className="mt-6 grid gap-4 lg:grid-cols-6">
                      <input type="hidden" name="eventId" value={event.id} />

                      <label className="text-foreground text-sm font-medium">
                        מסלול
                        <select name="plan" defaultValue={formPlan} className={`${fieldClass} mt-1.5`}>
                          {PLAN_CATALOG.map((plan) => (
                            <option key={plan.code} value={plan.code}>
                              {plan.name} — {formatPlanPrice(plan.priceAgorot)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="text-foreground text-sm font-medium">
                        סטטוס
                        <select
                          name="status"
                          defaultValue={currentStatus === 'legacy' ? 'active' : currentStatus}
                          className={`${fieldClass} mt-1.5`}
                        >
                          {(['trial', 'pending_payment', 'active', 'cancelled', 'refunded'] as LicenseStatus[]).map(
                            (status) => (
                              <option key={status} value={status}>
                                {statusLabel(status)}
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      <label className="text-foreground text-sm font-medium">
                        סכום בשקלים
                        <input
                          name="price"
                          type="number"
                          min="0"
                          max="10000"
                          step="1"
                          defaultValue={defaultPrice / 100}
                          className={`${fieldClass} mt-1.5`}
                        />
                      </label>

                      <label className="text-foreground text-sm font-medium">
                        אמצעי תשלום
                        <select
                          name="paymentMethod"
                          defaultValue={license?.paymentMethod ?? 'phone'}
                          className={`${fieldClass} mt-1.5`}
                        >
                          {PAYMENT_METHODS.map((method) => (
                            <option key={method} value={method}>
                              {PAYMENT_METHOD_LABELS[method]}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="text-foreground text-sm font-medium">
                        אסמכתה
                        <input
                          name="paymentReference"
                          defaultValue={license?.paymentReference ?? ''}
                          className={`${fieldClass} mt-1.5`}
                        />
                      </label>

                      <label className="text-foreground text-sm font-medium">
                        הערה
                        <input
                          name="notes"
                          defaultValue={license?.notes ?? ''}
                          className={`${fieldClass} mt-1.5`}
                        />
                      </label>

                      <div className="lg:col-span-6">
                        <Button type="submit">שמירה והפעלת המסלול</Button>
                      </div>
                    </form>
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
