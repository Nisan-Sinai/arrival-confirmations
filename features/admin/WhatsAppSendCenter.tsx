'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';

import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Alert, Badge } from '@/components/ui/feedback';
import {
  buildPersonalInviteSendPath,
  buildPremiumWhatsAppMessage,
  buildWhatsAppSendUrl,
  filterPremiumCampaignGuests,
  normalizeWhatsAppPhone,
  type PremiumAttendanceStatus,
  type PremiumCampaignScope,
  type PremiumMessageKind,
} from '@/lib/premiumWhatsApp';

/**
 * One WhatsApp sending surface, for both plans.
 *
 * There used to be two: a free "one-by-one" list with per-guest tracking, and a Premium
 * "send centre" with templates and filtering. Once the centre was fixed to send the same
 * personal links, the two did the same core job — send a tracked personal link — and a
 * host looking at both, on one page, could not tell them apart. So they are one surface
 * now: everyone gets the list with each guest's status and a send button; Premium unlocks
 * the control bar above it — message templates, an audience filter, and bulk progress —
 * that operates on the same list. There is no second card to compare against.
 */

export interface SendCenterGuest {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string;
  /** From the RSVP table, for the audience filter. */
  readonly attendanceStatus: PremiumAttendanceStatus;
  readonly inviteLinkIssuedAt: string | null;
  readonly inviteFirstOpenedAt: string | null;
  readonly inviteLastOpenedAt: string | null;
  readonly inviteOpenCount: number;
  readonly inviteLastResponseAt: string | null;
  readonly inviteLastResponseStatus: 'attending' | 'not_attending' | 'maybe' | null;
}

const PROGRESS_CHANGE_EVENT = 'whatsapp-send-progress-change';
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

function formatTrackingDate(value: string | null): string | null {
  if (value === null) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(date);
}

type ResponseStatus = 'attending' | 'not_attending' | 'maybe';

function responseLabel(status: ResponseStatus): string {
  if (status === 'attending') return 'מגיע/ה';
  if (status === 'not_attending') return 'לא מגיע/ה';
  return 'אולי';
}

function responseTone(status: ResponseStatus): 'success' | 'danger' | 'warning' {
  if (status === 'attending') return 'success';
  if (status === 'not_attending') return 'danger';
  return 'warning';
}

/** The link/open/answer story for one guest — the same signal on both plans. */
function TrackingStatus({ guest }: { readonly guest: SendCenterGuest }) {
  const lastOpenedAt = formatTrackingDate(guest.inviteLastOpenedAt);
  const responseAt = formatTrackingDate(guest.inviteLastResponseAt);
  const issuedAt = formatTrackingDate(guest.inviteLinkIssuedAt);
  const firstOpenedAt = formatTrackingDate(guest.inviteFirstOpenedAt);

  if (guest.inviteLastResponseStatus !== null) {
    return (
      <div className="mt-3 space-y-1.5">
        <Badge tone={responseTone(guest.inviteLastResponseStatus)}>
          {responseLabel(guest.inviteLastResponseStatus)}
        </Badge>
        <p className="text-muted-foreground text-xs">
          תשובה אחרונה{responseAt === null ? '' : `: ${responseAt}`}
        </p>
        {guest.inviteOpenCount > 0 && (
          <p className="text-muted-foreground text-xs">
            ההזמנה נפתחה {guest.inviteOpenCount} פעמים
            {lastOpenedAt === null ? '' : ` · לאחרונה ${lastOpenedAt}`}
          </p>
        )}
      </div>
    );
  }

  if (guest.inviteOpenCount > 0) {
    return (
      <div className="mt-3 space-y-1.5">
        <Badge tone="gold">ההזמנה נפתחה</Badge>
        <p className="text-muted-foreground text-xs">
          {guest.inviteOpenCount} פתיחות{lastOpenedAt === null ? '' : ` · לאחרונה ${lastOpenedAt}`}
        </p>
        {firstOpenedAt !== null && firstOpenedAt !== lastOpenedAt && (
          <p className="text-muted-foreground text-xs">פתיחה ראשונה: {firstOpenedAt}</p>
        )}
        <p className="text-muted-foreground text-xs">עדיין לא נבחרה תשובה.</p>
      </div>
    );
  }

  if (guest.inviteLinkIssuedAt !== null) {
    return (
      <div className="mt-3 space-y-1.5">
        <Badge tone="warning">קישור נוצר — טרם נפתח</Badge>
        {issuedAt !== null && (
          <p className="text-muted-foreground text-xs">הקישור נוצר ב־{issuedAt}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <Badge tone="outline">טרם נוצר קישור</Badge>
    </div>
  );
}

export function WhatsAppSendCenter({
  eventId,
  eventTitle,
  guests,
  premium,
}: {
  eventId: string;
  eventTitle: string;
  guests: readonly SendCenterGuest[];
  /** Premium/Pro (or a legacy event) unlock templates, filtering and bulk progress. */
  premium: boolean;
}) {
  const [kind, setKind] = useState<PremiumMessageKind>('invitation');
  const [scope, setScope] = useState<PremiumCampaignScope>('unanswered');
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');

  const selectKind = (next: PremiumMessageKind) => {
    setKind(next);
    setScope(next === 'update' || next === 'thanks' ? 'attending' : 'unanswered');
  };

  const storageKey = `whatsapp-send-progress:${eventId}:${kind}`;
  const getProgressSnapshot = useCallback(() => readProgressSnapshot(storageKey), [storageKey]);
  const progressSnapshot = useSyncExternalStore(
    subscribeToProgress,
    getProgressSnapshot,
    () => EMPTY_PROGRESS,
  );
  const sentGuestIdList = useMemo(() => parseStoredProgress(progressSnapshot), [progressSnapshot]);
  const sentGuestIds = useMemo(() => new Set(sentGuestIdList), [sentGuestIdList]);

  // Only the Premium controls filter; the free list is every guest, one at a time.
  const shownGuests = premium
    ? filterPremiumCampaignGuests(guests, scope, sentGuestIds, query)
    : guests;
  const answeredCount = guests.filter((guest) => guest.attendanceStatus !== null).length;
  const unansweredCount = guests.length - answeredCount;

  const markSent = (guestId: string) => {
    if (!premium || sentGuestIds.has(guestId)) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify([...sentGuestIdList, guestId]));
      announceProgressChange();
    } catch {
      // The send still opens WhatsApp when browser storage is unavailable.
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

  // A thank-you has no link, so it opens WhatsApp straight from the client and issues no
  // token. Every other message routes through the personal-invite issuer, which mints a
  // per-guest token so the reply lands on their row. The free plan always sends the plain
  // invitation the one-by-one list always sent — no `kind`, so the route keeps its wording.
  const sendHref = (guest: SendCenterGuest): string | null => {
    if (normalizeWhatsAppPhone(guest.phone) === null) return null;
    if (!premium) return `/share/guest/${guest.id}`;
    if (kind === 'thanks') {
      return buildWhatsAppSendUrl(
        guest.phone,
        buildPremiumWhatsAppMessage({ kind, guestName: guest.fullName, eventTitle, inviteUrl: '' }),
      );
    }
    return buildPersonalInviteSendPath({ guestId: guest.id, kind, note });
  };

  return (
    <Card padding="lg">
      <p className="text-eyebrow text-accent-strong font-semibold">
        {premium ? 'שליחה ומעקב · WhatsApp' : 'קישורים אישיים · אחד-אחד'}
      </p>
      <h2 className="text-h2 text-primary mt-2 font-bold">שליחה אישית ב־WhatsApp</h2>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        לכל מוזמן נוצר קישור אישי, וכאן רואים לכל אחד אם הקישור נוצר, אם ההזמנה נפתחה וכמה פעמים,
        ומה הייתה התשובה האחרונה. ההודעה נפתחת ב-WhatsApp הפרטי עם הקישור מוכן — ללא חיבור API וללא
        עלות.
      </p>

      {premium ? (
        <>
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
              מוצגים {shownGuests.length} מוזמנים · ההתקדמות נשמרת בנפרד לכל סוג הודעה.
            </p>
            {sentGuestIds.size > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={resetProgress}>
                איפוס סימוני השליחה
              </Button>
            )}
          </div>
        </>
      ) : (
        // The free plan sends one at a time. The bulk workflow is the upsell, shown here as
        // one line rather than a second competing card.
        <div className="border-accent/30 bg-accent-soft/30 mt-5 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm leading-relaxed">
            <span className="text-accent-strong font-semibold">Premium:</span> שליחה בכמות עם תבניות
            (תזכורת, עדכון, תודה), סינון של מי שעדיין לא ענה, וזיכרון של מי כבר קיבל.
          </p>
          <Link
            href="/pricing"
            className={buttonClass({ variant: 'outline', size: 'sm', className: 'shrink-0' })}
          >
            שדרוג ל-Premium
          </Link>
        </div>
      )}

      {guests.length === 0 ? (
        <p className="text-muted-foreground mt-6">הוסיפו מוזמנים כדי לשלוח קישורים אישיים.</p>
      ) : shownGuests.length === 0 ? (
        <Alert tone="success" className="mt-6">
          אין כרגע מוזמנים שמתאימים לסינון. ייתכן שכל המוזמנים כבר ענו או סומנו כנשלחו.
        </Alert>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {shownGuests.map((guest) => {
            const href = sendHref(guest);
            const wasSent = premium && sentGuestIds.has(guest.id);
            const isFirstSend = guest.inviteLinkIssuedAt === null;

            return (
              <li
                key={guest.id}
                className="border-border flex flex-col justify-between gap-4 rounded-2xl border p-4"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-primary font-semibold">{guest.fullName}</p>
                    {wasSent && (
                      <span className="bg-accent-soft text-accent-strong rounded-full px-2.5 py-1 text-xs font-medium">
                        סומן כנשלח
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm" dir="ltr">
                    {guest.phone}
                  </p>
                  <TrackingStatus guest={guest} />
                </div>
                {href === null ? (
                  <span className="text-destructive text-sm">מספר הטלפון אינו תקין</span>
                ) : (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markSent(guest.id)}
                    className={buttonClass({ variant: 'secondary', size: 'sm' })}
                  >
                    {isFirstSend ? 'שליחת לינק אישי' : 'שליחה מחדש'}
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
