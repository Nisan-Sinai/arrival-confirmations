'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';

import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import {
  buildPersonalInviteSendPath,
  buildPremiumWhatsAppMessage,
  buildWhatsAppSendUrl,
  filterPremiumCampaignGuests,
  normalizeWhatsAppPhone,
  type PremiumCampaignGuest,
  type PremiumCampaignScope,
  type PremiumMessageKind,
} from '@/lib/premiumWhatsApp';

const STATUS_LABELS: Record<Exclude<PremiumCampaignGuest['attendanceStatus'], null>, string> = {
  attending: 'מגיע/ה',
  not_attending: 'לא מגיע/ה',
  maybe: 'אולי',
};
const PROGRESS_CHANGE_EVENT = 'premium-whatsapp-progress-change';
const EMPTY_PROGRESS = '[]';

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
  guests,
}: {
  eventId: string;
  eventTitle: string;
  guests: readonly PremiumCampaignGuest[];
}) {
  const [kind, setKind] = useState<PremiumMessageKind>('invitation');
  const [scope, setScope] = useState<PremiumCampaignScope>('unanswered');
  /** What changed, for an `update`. Ignored by every other kind. */
  const [note, setNote] = useState('');

  /**
   * Choosing a kind moves the audience with it.
   *
   * An invitation goes to whoever has not answered; a change of venue and a thank-you go
   * to the people who said they were coming. Leaving the scope where it was would have
   * sent a thank-you to guests who declined, which reads as a mistake — and the host
   * would have had to notice a second dropdown to avoid it. Still a plain `setScope`, so
   * they can override it immediately.
   */
  const selectKind = (next: PremiumMessageKind) => {
    setKind(next);
    setScope(next === 'update' || next === 'thanks' ? 'attending' : 'unanswered');
  };
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
    () => filterPremiumCampaignGuests(guests, scope, sentGuestIds, query),
    [guests, query, scope, sentGuestIds],
  );
  const unansweredCount = guests.filter((guest) => guest.attendanceStatus === null).length;
  const answeredCount = guests.length - unansweredCount;

  const markSent = (guestId: string) => {
    if (sentGuestIds.has(guestId)) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify([...sentGuestIdList, guestId]));
      announceProgressChange();
    } catch {
      // The campaign still opens WhatsApp when browser storage is unavailable.
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
      <p className="text-eyebrow text-accent-strong font-semibold">בלעדי ל-Premium</p>
      <h2 className="text-h2 text-primary mt-2 font-bold">מרכז שליחה חכם ב-WhatsApp</h2>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        אותם קישורים אישיים שברשימת המוזמנים, אבל בכמות: כל הודעה נפתחת ב-WhatsApp הפרטי עם שם
        המוזמן וקישור אישי משלו, כך שהתשובה נרשמת על השורה שלו. המערכת מסננת מי שכבר ענה, זוכרת למי
        שלחת ומאפשרת להמשיך בדיוק מהמקום שבו עצרת — ללא חיבור API וללא עלות הודעות.
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
            onChange={(event) => selectKind(event.target.value as PremiumMessageKind)}
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
            onChange={(event) => setScope(event.target.value as PremiumCampaignScope)}
          >
            <option value="unanswered">רק מי שעדיין לא ענה</option>
            <option value="not_sent">רק מי שטרם סומן כנשלח</option>
            <option value="attending">רק מי שמגיע או שוקל</option>
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

      {/*
        Only for an update, because it is the only message whose content is not known in
        advance. "There has been a change" makes a guest open a link to find out what,
        and some of them will not — so the host says it in the message itself.
      */}
      {kind === 'update' && (
        <div className="mt-4">
          <Field
            label="מה השתנה?"
            hint="המשפט הזה נכנס להודעה עצמה, לפני הקישור. לדוגמה: האולם עבר לרחוב הרצל 4."
          >
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="האולם עבר לרחוב הרצל 4"
            />
          </Field>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          מוצגים {filteredGuests.length} מוזמנים · ההתקדמות נשמרת בנפרד לכל סוג הודעה.
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
            // Everything with a link now goes through the personal-invite issuer, which
            // mints a token for this guest and only then opens WhatsApp — that is what
            // makes the reply land on their row. A thank-you has no link and nothing to
            // issue, so it opens WhatsApp straight from the client as it always did.
            const phoneValid = normalizeWhatsAppPhone(guest.phone) !== null;
            const sendUrl =
              kind === 'thanks'
                ? buildWhatsAppSendUrl(
                    guest.phone,
                    // A thank-you carries no link, so the empty `inviteUrl` is never read.
                    buildPremiumWhatsAppMessage({
                      kind,
                      guestName: guest.fullName,
                      eventTitle,
                      inviteUrl: '',
                    }),
                  )
                : phoneValid
                  ? buildPersonalInviteSendPath({ guestId: guest.id, kind, note })
                  : null;
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
