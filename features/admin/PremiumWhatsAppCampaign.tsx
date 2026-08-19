'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';

import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';
import {
  buildPremiumWhatsAppMessage,
  buildWhatsAppSendUrl,
  filterPremiumCampaignGuests,
  type PremiumCampaignGuest,
  type PremiumCampaignScope,
  type PremiumMessageKind,
} from '@/lib/premiumWhatsApp';

const PROGRESS_CHANGE_EVENT = 'premium-whatsapp-progress-change';
const EMPTY_PROGRESS = '[]';

const COPY = {
  he: {
    exclusive: 'בלעדי ל-Premium',
    title: 'מרכז שליחה חכם ב-WhatsApp',
    intro: 'ההודעות נפתחות ב-WhatsApp הפרטי של בעל האירוע, עם שם המוזמן והקישור כבר בתוך ההודעה. המערכת מסננת מי שכבר ענה, זוכרת למי שלחת ומאפשרת להמשיך בדיוק מהמקום שבו עצרת — ללא חיבור API וללא עלות הודעות.',
    info: 'המערכת מכינה ופותחת את השיחה בלבד. בעל האירוע לוחץ בעצמו על כפתור השליחה ב-WhatsApp.',
    guests: 'מוזמנים',
    answered: 'כבר ענו',
    unanswered: 'טרם ענו',
    sentMarked: 'סומנו כנשלחו',
    kind: 'סוג ההודעה',
    invitation: 'הזמנה אישית',
    reminder: 'תזכורת אישית',
    group: 'קבוצת מוזמנים',
    onlyUnanswered: 'רק מי שעדיין לא ענה',
    onlyNotSent: 'רק מי שטרם סומן כנשלח',
    all: 'כל המוזמנים',
    search: 'חיפוש',
    searchPlaceholder: 'שם או מספר טלפון',
    shown: (count: number) => `מוצגים ${count} מוזמנים · ההתקדמות נשמרת בנפרד להזמנות ולתזכורות.`,
    reset: 'איפוס סימוני השליחה',
    empty: 'ייבאו מוזמנים כדי להתחיל לשלוח.',
    noMatches: 'אין כרגע מוזמנים שמתאימים לסינון. ייתכן שכל המוזמנים כבר ענו או סומנו כנשלחו.',
    noAnswer: 'טרם ענה/תה',
    attending: 'מגיע/ה',
    notAttending: 'לא מגיע/ה',
    maybe: 'אולי',
    sent: 'סומן כנשלח',
    invalidPhone: 'מספר הטלפון אינו תקין',
    resend: 'שליחה נוספת',
    openSend: 'פתיחה ושליחה ב-WhatsApp',
    forGuest: 'עבור',
  },
  en: {
    exclusive: 'Premium exclusive',
    title: 'Smart WhatsApp sending centre',
    intro: 'Messages open in the event host’s personal WhatsApp with the guest name and invitation link already included. The system filters guests who already replied, remembers who you sent to, and lets you continue exactly where you stopped — without an API connection or message fees.',
    info: 'The system only prepares and opens the conversation. The event host taps Send in WhatsApp.',
    guests: 'Guests',
    answered: 'Answered',
    unanswered: 'Unanswered',
    sentMarked: 'Marked sent',
    kind: 'Message type',
    invitation: 'Personal invitation',
    reminder: 'Personal reminder',
    group: 'Guest group',
    onlyUnanswered: 'Only guests who have not replied',
    onlyNotSent: 'Only guests not marked as sent',
    all: 'All guests',
    search: 'Search',
    searchPlaceholder: 'Name or phone number',
    shown: (count: number) => `Showing ${count} guests · progress is stored separately for invitations and reminders.`,
    reset: 'Reset sent markers',
    empty: 'Import guests to start sending.',
    noMatches: 'No guests currently match this filter. Everyone may already have replied or been marked as sent.',
    noAnswer: 'No reply yet',
    attending: 'Attending',
    notAttending: 'Not attending',
    maybe: 'Maybe',
    sent: 'Marked sent',
    invalidPhone: 'The phone number is invalid',
    resend: 'Send again',
    openSend: 'Open and send in WhatsApp',
    forGuest: 'for',
  },
} as const;

function subscribeToProgress(onStoreChange: () => void): () => void {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(PROGRESS_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(PROGRESS_CHANGE_EVENT, onStoreChange);
  };
}

function readProgressSnapshot(storageKey: string): string {
  try {
    return window.localStorage.getItem(storageKey) ?? EMPTY_PROGRESS;
  } catch {
    return EMPTY_PROGRESS;
  }
}

function parseStoredProgress(snapshot: string): string[] {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function announceProgressChange(): void {
  window.dispatchEvent(new Event(PROGRESS_CHANGE_EVENT));
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
  const locale = useAppLocale();
  const copy = COPY[locale];
  const statusLabels = {
    attending: copy.attending,
    not_attending: copy.notAttending,
    maybe: copy.maybe,
  } as const;
  const [kind, setKind] = useState<PremiumMessageKind>('invitation');
  const [scope, setScope] = useState<PremiumCampaignScope>('unanswered');
  const [query, setQuery] = useState('');
  const storageKey = `premium-whatsapp-progress:${eventId}:${kind}`;
  const getProgressSnapshot = useCallback(() => readProgressSnapshot(storageKey), [storageKey]);
  const progressSnapshot = useSyncExternalStore(
    subscribeToProgress,
    getProgressSnapshot,
    () => EMPTY_PROGRESS,
  );
  const sentGuestIdList = useMemo(() => parseStoredProgress(progressSnapshot), [progressSnapshot]);
  const sentGuestIds = useMemo(() => new Set(sentGuestIdList), [sentGuestIdList]);
  const filteredGuests = useMemo(
    () => filterPremiumCampaignGuests(guests, scope, sentGuestIds, query, locale),
    [guests, locale, query, scope, sentGuestIds],
  );
  const unansweredCount = guests.filter((guest) => guest.attendanceStatus === null).length;
  const answeredCount = guests.length - unansweredCount;

  const markSent = (guestId: string) => {
    if (sentGuestIds.has(guestId)) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify([...sentGuestIdList, guestId]));
      announceProgressChange();
    } catch {
      // Storage is an enhancement, not a requirement for sending.
    }
  };

  const resetProgress = () => {
    try {
      window.localStorage.removeItem(storageKey);
      announceProgressChange();
    } catch {
      // Storage is an enhancement, not a requirement for sending.
    }
  };

  return (
    <Card padding="lg">
      <p className="text-eyebrow text-accent-strong font-semibold">{copy.exclusive}</p>
      <h2 className="text-h2 text-primary mt-2 font-bold">{copy.title}</h2>
      <p className="text-muted-foreground mt-3 leading-relaxed">{copy.intro}</p>

      <Alert tone="info" className="mt-5">{copy.info}</Alert>

      <div className="mt-5 grid grid-cols-2 gap-3 text-center text-sm sm:grid-cols-4">
        <div className="bg-secondary/35 rounded-xl p-3"><span className="text-primary block text-2xl font-bold">{guests.length}</span>{copy.guests}</div>
        <div className="bg-secondary/35 rounded-xl p-3"><span className="text-primary block text-2xl font-bold">{answeredCount}</span>{copy.answered}</div>
        <div className="bg-secondary/35 rounded-xl p-3"><span className="text-primary block text-2xl font-bold">{unansweredCount}</span>{copy.unanswered}</div>
        <div className="bg-secondary/35 rounded-xl p-3"><span className="text-primary block text-2xl font-bold">{sentGuestIds.size}</span>{copy.sentMarked}</div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Field label={copy.kind}>
          <Select value={kind} onChange={(event) => setKind(event.target.value as PremiumMessageKind)}>
            <option value="invitation">{copy.invitation}</option>
            <option value="reminder">{copy.reminder}</option>
          </Select>
        </Field>
        <Field label={copy.group}>
          <Select value={scope} onChange={(event) => setScope(event.target.value as PremiumCampaignScope)}>
            <option value="unanswered">{copy.onlyUnanswered}</option>
            <option value="not_sent">{copy.onlyNotSent}</option>
            <option value="all">{copy.all}</option>
          </Select>
        </Field>
        <Field label={copy.search}>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">{copy.shown(filteredGuests.length)}</p>
        {sentGuestIds.size > 0 && <Button type="button" variant="ghost" size="sm" onClick={resetProgress}>{copy.reset}</Button>}
      </div>

      {guests.length === 0 ? (
        <p className="text-muted-foreground mt-6">{copy.empty}</p>
      ) : filteredGuests.length === 0 ? (
        <Alert tone="success" className="mt-6">{copy.noMatches}</Alert>
      ) : (
        <ul className="mt-5 space-y-3">
          {filteredGuests.map((guest) => {
            const message = buildPremiumWhatsAppMessage({ kind, guestName: guest.fullName, eventTitle, inviteUrl, locale });
            const sendUrl = buildWhatsAppSendUrl(guest.phone, message);
            const wasSent = sentGuestIds.has(guest.id);
            return (
              <li key={guest.id} className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-primary font-semibold">{guest.fullName}</p>
                    <span className="bg-secondary/50 text-muted-foreground rounded-full px-2.5 py-1 text-xs">
                      {guest.attendanceStatus === null ? copy.noAnswer : statusLabels[guest.attendanceStatus]}
                    </span>
                    {wasSent && <span className="bg-accent-soft text-accent-strong rounded-full px-2.5 py-1 text-xs font-medium">{copy.sent}</span>}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm" dir="ltr">{guest.phone}</p>
                </div>
                {sendUrl === null ? (
                  <span className="text-destructive text-sm">{copy.invalidPhone}</span>
                ) : (
                  <a href={sendUrl} target="_blank" rel="noopener noreferrer" onClick={() => markSent(guest.id)} className={buttonClass({ size: 'sm' })}>
                    {wasSent ? copy.resend : copy.openSend}
                    <span className="sr-only"> {copy.forGuest} {guest.fullName}</span>
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
