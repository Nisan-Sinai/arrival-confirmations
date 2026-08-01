'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import {
  buildPremiumWhatsAppMessage,
  buildWhatsAppSendUrl,
  filterPremiumCampaignGuests,
  type PremiumCampaignGuest,
  type PremiumCampaignScope,
  type PremiumMessageKind,
} from '@/lib/premiumWhatsApp';

const STATUS_LABELS: Record<Exclude<PremiumCampaignGuest['attendanceStatus'], null>, string> = {
  attending: 'מגיע/ה',
  not_attending: 'לא מגיע/ה',
  maybe: 'אולי',
};

function readStoredProgress(storageKey: string): string[] {
  try {
    const value = window.localStorage.getItem(storageKey);
    if (value === null) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function PremiumWhatsAppCampaign({
  eventId,
  eventTitle,
  inviteUrl,
  guests,
}: {
  eventId: string;
  eventTitle: string;
  inviteUrl: string;
  guests: readonly PremiumCampaignGuest[];
}) {
  const [kind, setKind] = useState<PremiumMessageKind>('invitation');
  const [scope, setScope] = useState<PremiumCampaignScope>('unanswered');
  const [query, setQuery] = useState('');
  const [sentGuestIdList, setSentGuestIdList] = useState<string[]>([]);
  const storageKey = `premium-whatsapp-progress:${eventId}:${kind}`;

  useEffect(() => {
    setSentGuestIdList(readStoredProgress(storageKey));
  }, [storageKey]);

  const sentGuestIds = useMemo(() => new Set(sentGuestIdList), [sentGuestIdList]);
  const filteredGuests = useMemo(
    () => filterPremiumCampaignGuests(guests, scope, sentGuestIds, query),
    [guests, query, scope, sentGuestIds],
  );
  const unansweredCount = guests.filter((guest) => guest.attendanceStatus === null).length;
  const answeredCount = guests.length - unansweredCount;

  const markSent = (guestId: string) => {
    setSentGuestIdList((current) => {
      if (current.includes(guestId)) return current;
      const next = [...current, guestId];
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // The campaign still works when storage is blocked; only remembered progress is unavailable.
      }
      return next;
    });
  };

  const resetProgress = () => {
    setSentGuestIdList([]);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // See markSent: storage is an enhancement, not a requirement for sending.
    }
  };

  return (
    <Card padding="lg">
      <p className="text-eyebrow text-accent-strong font-semibold">בלעדי ל-Premium</p>
      <h2 className="text-h2 text-primary mt-2 font-bold">מרכז שליחה חכם ב-WhatsApp</h2>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        ההודעות נפתחות ב-WhatsApp הפרטי של בעל האירוע, עם שם המוזמן והקישור כבר בתוך ההודעה.
        המערכת מסננת מי שכבר ענה, זוכרת למי שלחת ומאפשרת להמשיך בדיוק מהמקום שבו עצרת — ללא
        חיבור API וללא עלות הודעות.
      </p>

      <Alert tone="info" className="mt-5">
        המערכת מכינה ופותחת את השיחה בלבד. בעל האירוע לוחץ בעצמו על כפתור השליחה ב-WhatsApp.
      </Alert>

      <div className="mt-5 grid grid-cols-2 gap-3 text-center text-sm sm:grid-cols-4">
        <div className="bg-secondary/35 rounded-xl p-3">
          <span className="text-primary block text-2xl font-bold">{guests.length}</span>
          מוזמנים
        </div>
        <div className="bg-secondary/35 rounded-xl p-3">
          <span className="text-primary block text-2xl font-bold">{answeredCount}</span>
          כבר ענו
        </div>
        <div className="bg-secondary/35 rounded-xl p-3">
          <span className="text-primary block text-2xl font-bold">{unansweredCount}</span>
          טרם ענו
        </div>
        <div className="bg-secondary/35 rounded-xl p-3">
          <span className="text-primary block text-2xl font-bold">{sentGuestIds.size}</span>
          סומנו כנשלחו
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Field label="סוג ההודעה">
          <Select
            value={kind}
            onChange={(event) => setKind(event.target.value as PremiumMessageKind)}
          >
            <option value="invitation">הזמנה אישית</option>
            <option value="reminder">תזכורת אישית</option>
          </Select>
        </Field>
        <Field label="קבוצת מוזמנים">
          <Select
            value={scope}
            onChange={(event) => setScope(event.target.value as PremiumCampaignScope)}
          >
            <option value="unanswered">רק מי שעדיין לא ענה</option>
            <option value="not_sent">רק מי שטרם סומן כנשלח</option>
            <option value="all">כל המוזמנים</option>
          </Select>
        </Field>
        <Field label="חיפוש">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="שם או מספר טלפון"
          />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          מוצגים {filteredGuests.length} מוזמנים · ההתקדמות נשמרת בנפרד להזמנות ולתזכורות.
        </p>
        {sentGuestIds.size > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={resetProgress}>
            איפוס סימוני השליחה
          </Button>
        )}
      </div>

      {guests.length === 0 ? (
        <p className="text-muted-foreground mt-6">ייבאו מוזמנים כדי להתחיל לשלוח.</p>
      ) : filteredGuests.length === 0 ? (
        <Alert tone="success" className="mt-6">
          אין כרגע מוזמנים שמתאימים לסינון. ייתכן שכל המוזמנים כבר ענו או סומנו כנשלחו.
        </Alert>
      ) : (
        <ul className="mt-5 space-y-3">
          {filteredGuests.map((guest) => {
            const message = buildPremiumWhatsAppMessage({
              kind,
              guestName: guest.fullName,
              eventTitle,
              inviteUrl,
            });
            const sendUrl = buildWhatsAppSendUrl(guest.phone, message);
            const wasSent = sentGuestIds.has(guest.id);

            return (
              <li
                key={guest.id}
                className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-primary font-semibold">{guest.fullName}</p>
                    <span className="bg-secondary/50 text-muted-foreground rounded-full px-2.5 py-1 text-xs">
                      {guest.attendanceStatus === null
                        ? 'טרם ענה/תה'
                        : STATUS_LABELS[guest.attendanceStatus]}
                    </span>
                    {wasSent && (
                      <span className="bg-accent-soft text-accent-strong rounded-full px-2.5 py-1 text-xs font-medium">
                        סומן כנשלח
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm" dir="ltr">
                    {guest.phone}
                  </p>
                </div>

                {sendUrl === null ? (
                  <span className="text-destructive text-sm">מספר הטלפון אינו תקין</span>
                ) : (
                  <a
                    href={sendUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markSent(guest.id)}
                    className={buttonClass({ size: 'sm' })}
                  >
                    {wasSent ? 'שליחה נוספת' : 'פתיחה ושליחה ב-WhatsApp'}
                    <span className="sr-only"> עבור {guest.fullName}</span>
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
