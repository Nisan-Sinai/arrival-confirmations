'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Alert, Badge } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/icons';
import { StatCard } from '@/components/ui/stat';
import { formatStoredPhoneForDisplay } from '@/lib/phone';
import {
  filterPremiumCampaignGuests,
  normalizeWhatsAppPhone,
  type PremiumAttendanceStatus,
  type PremiumCampaignScope,
  type PremiumMessageKind,
} from '@/lib/premiumWhatsApp';

interface AutomaticWhatsAppGuest {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string;
  readonly attendanceStatus: PremiumAttendanceStatus;
}

interface BatchResponse {
  readonly sent: number;
  readonly failed: number;
  readonly alreadySent: number;
  readonly invalid: number;
  readonly results: readonly {
    readonly guestId: string;
    readonly status: 'sent' | 'failed' | 'already_sent' | 'invalid';
  }[];
}

const BATCH_SIZE = 20;

function chunks<T>(items: readonly T[], size: number): readonly T[][] {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

export function AutomaticWhatsAppSendPanel({
  eventId,
  eventTitle,
  guests,
  enabled,
}: {
  readonly eventId: string;
  readonly eventTitle: string;
  readonly guests: readonly AutomaticWhatsAppGuest[];
  readonly enabled: boolean;
}) {
  const [kind, setKind] = useState<PremiumMessageKind>('invitation');
  const [scope, setScope] = useState<PremiumCampaignScope>('unanswered');
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [sentGuestIds, setSentGuestIds] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [summary, setSummary] = useState<{
    sent: number;
    failed: number;
    alreadySent: number;
    invalid: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const shownGuests = useMemo(
    () => filterPremiumCampaignGuests(guests, scope, sentGuestIds, query),
    [guests, query, scope, sentGuestIds],
  );
  const reachableGuests = useMemo(
    () => shownGuests.filter((guest) => normalizeWhatsAppPhone(guest.phone) !== null),
    [shownGuests],
  );
  const invalidCount = shownGuests.length - reachableGuests.length;

  const selectKind = (next: PremiumMessageKind) => {
    setKind(next);
    setScope(next === 'update' || next === 'thanks' ? 'attending' : 'unanswered');
    setConfirming(false);
    setSummary(null);
    setError(null);
    setCampaignId(null);
  };

  const sendAll = async () => {
    if (reachableGuests.length === 0 || sending) return;

    setSending(true);
    setConfirming(false);
    setProcessed(0);
    setSummary(null);
    setError(null);

    const activeCampaignId = campaignId ?? crypto.randomUUID();
    setCampaignId(activeCampaignId);
    const guestBatches = chunks(reachableGuests, BATCH_SIZE);
    const totals = { sent: 0, failed: 0, alreadySent: 0, invalid: invalidCount };
    const delivered = new Set(sentGuestIds);

    try {
      for (const batch of guestBatches) {
        const response = await fetch(`/api/events/${eventId}/whatsapp/send`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            campaignId: activeCampaignId,
            guestIds: batch.map((guest) => guest.id),
            kind,
            note: kind === 'update' ? note.trim() : undefined,
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          (BatchResponse & { readonly error?: string }) | null;

        if (!response.ok || payload === null) {
          if (payload?.error === 'whatsapp_not_configured') {
            throw new Error('whatsapp_not_configured');
          }
          if (payload?.error === 'premium_required') throw new Error('premium_required');
          if (payload?.error === 'rate_limited') throw new Error('rate_limited');
          throw new Error('batch_failed');
        }

        totals.sent += payload.sent;
        totals.failed += payload.failed;
        totals.alreadySent += payload.alreadySent;
        totals.invalid += payload.invalid;

        for (const result of payload.results) {
          if (result.status === 'sent' || result.status === 'already_sent') {
            delivered.add(result.guestId);
          }
        }

        setSentGuestIds(new Set(delivered));
        setProcessed((current) => current + batch.length);
      }

      setSummary(totals);
      setCampaignId(null);
    } catch (sendError) {
      const code = sendError instanceof Error ? sendError.message : 'batch_failed';
      setError(
        code === 'whatsapp_not_configured'
          ? 'WhatsApp Business עדיין לא הוגדר. יש להגדיר מספר שולח בממשק האדמין ולוודא שה-Access Token והתבניות מוגדרים ב-Vercel.'
          : code === 'premium_required'
            ? 'שליחה אוטומטית זמינה רק באירוע עם חבילת Premium או Pro פעילה.'
            : code === 'rate_limited'
              ? 'בוצעו הרבה שליחות בזמן קצר. נסו שוב בעוד שעה.'
              : 'השליחה נעצרה באמצע. ההודעות שכבר נשלחו לא יישלחו שוב באותו ניסיון.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Card id="whatsapp-send-center" padding="lg" className="scroll-mt-32">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="bg-accent-soft/70 text-accent-strong flex size-11 shrink-0 items-center justify-center rounded-xl"
        >
          <Icon name="whatsapp" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-eyebrow text-accent-strong font-semibold">WhatsApp Business</p>
          <h2 className="text-primary mt-1 text-xl font-bold sm:text-2xl">
            שליחה אוטומטית מהמספר המרכזי
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            בוחרים קבוצה ולוחצים פעם אחת. השרת שולח לכל מוזמן הודעה אישית מהמספר העסקי של המערכת,
            בלי לפתוח WhatsApp במכשיר ובלי לעבור איש-איש. לכל הודעה נשמר סטטוס שליחה.
          </p>
        </div>
      </div>

      {!enabled ? (
        <Alert tone="warning" className="mt-5">
          שליחה אוטומטית מהמספר העסקי זמינה באירוע Premium או Pro פעיל.
        </Alert>
      ) : (
        <>
          <Alert tone="info" className="mt-5">
            ההודעות יוצאות דרך WhatsApp Business Cloud API. יש לשלוח רק למוזמנים שנתנו הסכמה לקבל
            הודעות WhatsApp מהעסק.
          </Alert>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="מוזמנים" value={guests.length} icon={<Icon name="users" />} />
            <StatCard label="מוצגים" value={shownGuests.length} icon={<Icon name="filter" />} />
            <StatCard
              label="תקינים לשליחה"
              value={reachableGuests.length}
              icon={<Icon name="check-circle" />}
            />
            <StatCard label="נשלחו כעת" value={sentGuestIds.size} icon={<Icon name="send" />} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Field label="סוג הודעה">
              <Select
                value={kind}
                onChange={(event) => selectKind(event.target.value as PremiumMessageKind)}
                disabled={sending}
              >
                <option value="invitation">הזמנה אישית</option>
                <option value="reminder">תזכורת אישית</option>
                <option value="update">עדכון על שינוי באירוע</option>
                <option value="thanks">תודה אחרי האירוע</option>
              </Select>
            </Field>

            <Field label="קבוצת מוזמנים">
              <Select
                value={scope}
                onChange={(event) => {
                  setScope(event.target.value as PremiumCampaignScope);
                  setConfirming(false);
                  setCampaignId(null);
                }}
                disabled={sending}
              >
                <option value="unanswered">רק מי שעדיין לא ענה</option>
                <option value="not_sent">רק מי שטרם נשלח כעת</option>
                <option value="attending">רק מי שמגיע או שוקל</option>
                <option value="all">כל המוזמנים</option>
              </Select>
            </Field>

            <Field label="חיפוש">
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setConfirming(false);
                  setCampaignId(null);
                }}
                disabled={sending}
                placeholder="שם או מספר טלפון"
              />
            </Field>
          </div>

          {kind === 'update' && (
            <div className="mt-4">
              <Field
                label="מה השתנה?"
                hint="הטקסט ייכנס לתבנית WhatsApp המאושרת לפני הקישור האישי."
              >
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                  maxLength={500}
                  disabled={sending}
                  placeholder="לדוגמה: האולם עבר לרחוב הרצל 4"
                />
              </Field>
            </div>
          )}

          <div className="border-accent/30 bg-accent-soft/25 mt-5 rounded-xl border p-4">
            <p className="text-primary font-semibold">
              שליחה אוטומטית ל-{reachableGuests.length} מוזמנים · {eventTitle}
            </p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              השליחה מתבצעת בקבוצות קטנות כדי לשמור על יציבות. אפשר להחליף בעתיד את מספר השולח דרך
              הגדרות Vercel בלי שינוי קוד.
            </p>

            {invalidCount > 0 && (
              <p className="text-warning mt-2 text-sm">
                {invalidCount} מספרים לא תקינים לא יישלחו.
              </p>
            )}

            {sending && (
              <div className="mt-4" role="status" aria-live="polite">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span>שולח הודעות…</span>
                  <span>
                    {processed} / {reachableGuests.length}
                  </span>
                </div>
                <progress
                  className="mt-2 h-2 w-full"
                  value={processed}
                  max={Math.max(reachableGuests.length, 1)}
                />
              </div>
            )}

            {!sending && !confirming && (
              <Button
                type="button"
                className="mt-4"
                disabled={reachableGuests.length === 0}
                onClick={() => {
                  setSummary(null);
                  setError(null);
                  setConfirming(true);
                }}
              >
                <Icon name="send" />
                שליחה אוטומטית לכולם ({reachableGuests.length})
              </Button>
            )}

            {!sending && confirming && (
              <div className="border-warning/35 bg-warning-soft/40 mt-4 rounded-xl border p-4">
                <p className="text-primary font-semibold">אישור לפני שליחה המונית</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  יישלחו עכשיו {reachableGuests.length} הודעות WhatsApp מהמספר העסקי המרכזי.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void sendAll()}>
                    אישור ושליחה עכשיו
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
                    ביטול
                  </Button>
                </div>
              </div>
            )}
          </div>

          {summary !== null && (
            <Alert tone={summary.failed > 0 ? 'warning' : 'success'} className="mt-4">
              נשלחו {summary.sent} הודעות
              {summary.alreadySent > 0 ? ` · ${summary.alreadySent} כבר היו מסומנות כנשלחו` : ''}
              {summary.failed > 0 ? ` · ${summary.failed} נכשלו` : ''}
              {summary.invalid > 0 ? ` · ${summary.invalid} מספרים לא תקינים` : ''}.
            </Alert>
          )}

          {error !== null && (
            <Alert tone="error" className="mt-4">
              {error}
            </Alert>
          )}

          {shownGuests.length > 0 && (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {shownGuests.map((guest) => {
                const valid = normalizeWhatsAppPhone(guest.phone) !== null;
                const sent = sentGuestIds.has(guest.id);
                return (
                  <li
                    key={guest.id}
                    className="border-border bg-card flex items-center justify-between gap-3 rounded-xl border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-primary truncate font-semibold">{guest.fullName}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs" dir="ltr">
                        {formatStoredPhoneForDisplay(guest.phone)}
                      </p>
                    </div>
                    {sent ? (
                      <Badge tone="success">נשלח</Badge>
                    ) : valid ? (
                      <Badge tone="outline">מוכן</Badge>
                    ) : (
                      <Badge tone="danger">מספר לא תקין</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}
