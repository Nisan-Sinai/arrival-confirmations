import type { Metadata } from 'next';

import { updateEventLicenseAction } from '@/app/actions/manageLicense';
import { getEventLicenses, trialEventLicense } from '@/app/_lib/eventLicenses';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PLAN_CATALOG,
  formatPlanPrice,
  getPlanDefinition,
  getPlanLabel,
  isMonetizedEvent,
  type LicenseStatus,
} from '@/app/_lib/plans';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { Alert, Badge, EmptyState } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/icons';
import { Container } from '@/components/ui/layout';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { createPrivilegedClient } from '@/lib/server/supabase';

export const metadata: Metadata = {
  title: 'ניהול מסלולים ותשלומים',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

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
  readonly searchParams: Promise<{ q?: string; updated?: string }>;
}

export default async function AdminPlansPage({ searchParams }: AdminPlansPageProps) {
  const { q = '', updated = '' } = await searchParams;
  const query = q.trim().toLowerCase();
  const privileged = createPrivilegedClient();

  const [{ data: events, error }, { data: usersData }] = await Promise.all([
    privileged
      .from('events')
      .select(
        'id, owner_user_id, title, event_date, contact_phone, public_id, is_active, created_at',
      )
      .order('created_at', { ascending: false }),
    privileged.auth.admin.listUsers({ page: 1, perPage: 1_000 }),
  ]);

  if (error) throw new Error(`admin event list failed: ${error.code}`);

  const ownerEmails = new Map(
    (usersData?.users ?? []).map((user) => [user.id, user.email ?? 'ללא אימייל'] as const),
  );
  const eventRows = events ?? [];
  const licenses = await getEventLicenses(eventRows.map((event) => event.id));
  for (const event of eventRows) {
    const current = licenses.get(event.id);
    if (current?.changedAt === null && isMonetizedEvent(event.created_at)) {
      licenses.set(event.id, trialEventLicense(event.id));
    }
  }

  const updatedEvent = updated === '' ? undefined : eventRows.find((event) => event.id === updated);
  const updatedLicense = updatedEvent === undefined ? undefined : licenses.get(updatedEvent.id);

  const filtered = eventRows.filter((event) => {
    if (query === '') return true;
    const ownerEmail =
      event.owner_user_id === null ? '' : (ownerEmails.get(event.owner_user_id) ?? '');
    return [event.id, event.public_id, event.title, event.contact_phone ?? '', ownerEmail]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  return (
    <main id="main" className="flex-1 py-8 sm:py-12">
      <Container width="wide">
        <PageHeader
          eyebrow="ניהול ידני"
          title="מסלולים ותשלומים"
          lede="לאחר קבלת תשלום בטלפון, ב-Bit או בהעברה, בוחרים מסלול ומפעילים אותו לאירוע. כל שינוי נשמר ביומן פעולות בלתי מחיק."
          actions={<Badge tone="outline">{eventRows.length} אירועים במערכת</Badge>}
        />

        <form role="search" className="mt-8 flex max-w-2xl gap-2">
          <SearchInput
            label="חיפוש אירוע"
            name="q"
            defaultValue={q}
            placeholder="שם אירוע, אימייל, טלפון או מזהה"
            className="flex-1"
          />
          <Button type="submit" variant="outline">
            חיפוש
          </Button>
        </form>

        {updatedEvent !== undefined && updatedLicense !== undefined && (
          <Alert tone="success" className="mt-6" title="המסלול נשמר והמסכים עודכנו בהצלחה.">
            {updatedEvent.title}: {getPlanLabel(updatedLicense.plan)} ·{' '}
            {statusLabel(updatedLicense.status)} · {formatPlanPrice(updatedLicense.priceAgorot)}
          </Alert>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            className="mt-10"
            title="לא נמצאו אירועים"
            description="נסו לחפש לפי שם האירוע, כתובת האימייל, הטלפון או המזהה."
          />
        ) : (
          <ul className="mt-8 space-y-5">
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
                  : (ownerEmails.get(event.owner_user_id) ?? event.owner_user_id);

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
                        <Badge
                          tone={
                            currentPlan === 'premium' || currentPlan === 'pro' ? 'gold' : 'neutral'
                          }
                        >
                          {getPlanLabel(currentPlan)}
                        </Badge>
                        <Badge tone={statusTone(currentStatus)}>{statusLabel(currentStatus)}</Badge>
                        <Badge tone={event.is_active ? 'success' : 'warning'}>
                          {event.is_active ? 'הזמנה מפורסמת' : 'טיוטה'}
                        </Badge>
                      </div>
                    </div>

                    <dl className="border-border bg-secondary/25 mt-5 grid gap-3 rounded-xl border px-4 py-3 text-sm sm:grid-cols-3">
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

                    <form
                      action={updateEventLicenseAction}
                      className="mt-6 grid gap-4 lg:grid-cols-6"
                    >
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="currentPlan" value={formPlan} />
                      <input type="hidden" name="currentPriceAgorot" value={String(defaultPrice)} />
                      <input type="hidden" name="q" value={q} />

                      <Field
                        label="מסלול"
                        hint="מעבר ממצב בדיקה למסלול בתשלום מפעיל אותו אוטומטית ומעדכן למחיר המחירון, אלא אם הזנת מחיר אחר."
                        className="lg:col-span-2"
                      >
                        <Select name="plan" defaultValue={formPlan}>
                          {PLAN_CATALOG.map((plan) => (
                            <option key={plan.code} value={plan.code}>
                              {plan.name} — {formatPlanPrice(plan.priceAgorot)}
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <Field label="סטטוס">
                        <Select
                          name="status"
                          defaultValue={currentStatus === 'legacy' ? 'active' : currentStatus}
                        >
                          {(
                            [
                              'trial',
                              'pending_payment',
                              'active',
                              'cancelled',
                              'refunded',
                            ] as LicenseStatus[]
                          ).map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(status)}
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <Field label="סכום בשקלים">
                        <Input
                          name="price"
                          type="number"
                          min="0"
                          max="10000"
                          step="0.01"
                          defaultValue={defaultPrice / 100}
                        />
                      </Field>

                      <Field label="אמצעי תשלום">
                        <Select
                          name="paymentMethod"
                          defaultValue={license?.paymentMethod ?? 'phone'}
                        >
                          {PAYMENT_METHODS.map((method) => (
                            <option key={method} value={method}>
                              {PAYMENT_METHOD_LABELS[method]}
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <Field label="אסמכתה">
                        <Input
                          name="paymentReference"
                          defaultValue={license?.paymentReference ?? ''}
                        />
                      </Field>

                      <Field label="הערה" className="lg:col-span-3">
                        <Input name="notes" defaultValue={license?.notes ?? ''} />
                      </Field>

                      <div className="flex items-end lg:col-span-3 lg:justify-end">
                        <Button type="submit">
                          <Icon name="check" strokeWidth={2.2} />
                          שמירה והפעלת המסלול
                        </Button>
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
