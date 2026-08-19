import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';
import { getAppCopy } from '@/config/appCopy';
import type { Locale } from '@/lib/i18n';
import { languageTag } from '@/lib/i18n';

type AttendanceStatus = 'attending' | 'not_attending' | 'maybe';

interface PersonalInviteGuest {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string;
  readonly inviteLinkIssuedAt: string | null;
  readonly inviteFirstOpenedAt: string | null;
  readonly inviteLastOpenedAt: string | null;
  readonly inviteOpenCount: number;
  readonly inviteLastResponseAt: string | null;
  readonly inviteLastResponseStatus: AttendanceStatus | null;
}

const COPY = {
  he: {
    eyebrow: 'קישורים אישיים ומעקב',
    title: 'שליחה אישית ב־WhatsApp',
    intro: 'לכל מוזמן נוצר קישור ייחודי. כאן רואים אם הקישור נוצר, אם ההזמנה נפתחה וכמה פעמים, ומה הייתה הבחירה האחרונה: מגיע/ה, לא מגיע/ה או אולי.',
    note: 'יצירת קישור חדש מבטלת את הקישור הקודם. פתיחה נספרת רק לאחר שהעמוד נטען בדפדפן, כדי שתצוגה מקדימה אוטומטית של WhatsApp לא תיחשב לפתיחה.',
    empty: 'הוסיפו מוזמנים כדי לשלוח קישורים אישיים.',
    responseLast: 'תשובה אחרונה',
    openedTimes: (count: number) => `ההזמנה נפתחה ${count} פעמים`,
    recently: 'לאחרונה',
    opened: 'ההזמנה נפתחה',
    openings: (count: number) => `${count} פתיחות`,
    firstOpened: 'פתיחה ראשונה',
    noAnswer: 'עדיין לא נבחרה תשובה.',
    linkCreated: 'קישור נוצר — טרם נפתח',
    linkCreatedAt: 'הקישור נוצר ב־',
    noLink: 'טרם נוצר קישור',
    send: 'שליחת לינק אישי',
    resend: 'שליחה מחדש',
    attending: 'מגיע/ה',
    notAttending: 'לא מגיע/ה',
    maybe: 'אולי',
  },
  en: {
    eyebrow: 'Personal links & tracking',
    title: 'Personal WhatsApp sending',
    intro: 'Each guest gets a unique link. You can see whether a link was created, whether the invitation was opened and how many times, and the latest response: attending, not attending or maybe.',
    note: 'Creating a new link revokes the previous one. An open is counted only after the page loads in a browser, so an automatic WhatsApp preview is not counted as a guest open.',
    empty: 'Add guests to send personal invitation links.',
    responseLast: 'Latest response',
    openedTimes: (count: number) => `Invitation opened ${count} times`,
    recently: 'last',
    opened: 'Invitation opened',
    openings: (count: number) => `${count} opens`,
    firstOpened: 'First opened',
    noAnswer: 'No response has been selected yet.',
    linkCreated: 'Link created — not opened yet',
    linkCreatedAt: 'Link created at ',
    noLink: 'No link created yet',
    send: 'Send personal link',
    resend: 'Send again',
    attending: 'Attending',
    notAttending: 'Not attending',
    maybe: 'Maybe',
  },
} as const;

function formatTrackingDate(value: string | null, locale: Locale): string | null {
  if (value === null) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(languageTag(locale), {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(date);
}

function responseTone(status: AttendanceStatus): 'success' | 'danger' | 'warning' {
  if (status === 'attending') return 'success';
  if (status === 'not_attending') return 'danger';
  return 'warning';
}

function TrackingStatus({
  guest,
  locale,
}: {
  readonly guest: PersonalInviteGuest;
  readonly locale: Locale;
}) {
  const copy = COPY[locale];
  const issuedAt = formatTrackingDate(guest.inviteLinkIssuedAt, locale);
  const firstOpenedAt = formatTrackingDate(guest.inviteFirstOpenedAt, locale);
  const lastOpenedAt = formatTrackingDate(guest.inviteLastOpenedAt, locale);
  const responseAt = formatTrackingDate(guest.inviteLastResponseAt, locale);
  const responseLabel =
    guest.inviteLastResponseStatus === 'attending'
      ? copy.attending
      : guest.inviteLastResponseStatus === 'not_attending'
        ? copy.notAttending
        : copy.maybe;

  if (guest.inviteLastResponseStatus !== null) {
    return (
      <div className="mt-3 space-y-1.5">
        <Badge tone={responseTone(guest.inviteLastResponseStatus)}>{responseLabel}</Badge>
        <p className="text-muted-foreground text-xs">
          {copy.responseLast}
          {responseAt === null ? '' : `: ${responseAt}`}
        </p>
        {guest.inviteOpenCount > 0 && (
          <p className="text-muted-foreground text-xs">
            {copy.openedTimes(guest.inviteOpenCount)}
            {lastOpenedAt === null ? '' : ` · ${copy.recently} ${lastOpenedAt}`}
          </p>
        )}
      </div>
    );
  }

  if (guest.inviteOpenCount > 0) {
    return (
      <div className="mt-3 space-y-1.5">
        <Badge tone="gold">{copy.opened}</Badge>
        <p className="text-muted-foreground text-xs">
          {copy.openings(guest.inviteOpenCount)}
          {lastOpenedAt === null ? '' : ` · ${copy.recently} ${lastOpenedAt}`}
        </p>
        {firstOpenedAt !== null && firstOpenedAt !== lastOpenedAt && (
          <p className="text-muted-foreground text-xs">
            {copy.firstOpened}: {firstOpenedAt}
          </p>
        )}
        <p className="text-muted-foreground text-xs">{copy.noAnswer}</p>
      </div>
    );
  }

  if (guest.inviteLinkIssuedAt !== null) {
    return (
      <div className="mt-3 space-y-1.5">
        <Badge tone="warning">{copy.linkCreated}</Badge>
        {issuedAt !== null && (
          <p className="text-muted-foreground text-xs">
            {copy.linkCreatedAt}
            {issuedAt}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <Badge tone="outline">{copy.noLink}</Badge>
    </div>
  );
}

export function PersonalInviteSendList({
  guests,
  locale,
}: {
  readonly guests: readonly PersonalInviteGuest[];
  readonly locale: Locale;
}) {
  const copy = COPY[locale];
  const publicCopy = getAppCopy(locale).personalRsvp;

  return (
    <Card padding="lg">
      <p className="text-eyebrow text-accent-strong font-semibold">{copy.eyebrow}</p>
      <h2 className="text-h2 text-primary mt-2 font-bold">{copy.title}</h2>
      <p className="text-muted-foreground mt-3 leading-relaxed">{copy.intro}</p>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{copy.note}</p>

      {guests.length === 0 ? (
        <p className="text-muted-foreground mt-6">{copy.empty}</p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {guests.map((guest) => (
            <li
              key={guest.id}
              className="border-border flex flex-col justify-between gap-4 rounded-2xl border p-4"
            >
              <div>
                <p className="text-primary font-semibold">{guest.fullName}</p>
                <p className="text-muted-foreground mt-1 text-sm" dir="ltr">
                  {guest.phone}
                </p>
                <TrackingStatus guest={guest} locale={locale} />
              </div>
              <a
                href={`/share/guest/${guest.id}?locale=${locale}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({ variant: 'secondary', size: 'sm' })}
                aria-label={`${guest.inviteLinkIssuedAt === null ? copy.send : copy.resend}: ${guest.fullName}`}
              >
                {guest.inviteLinkIssuedAt === null ? copy.send : copy.resend}
                <span className="sr-only"> · {publicCopy.eyebrow}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
