import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';

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

function responseLabel(status: AttendanceStatus): string {
  if (status === 'attending') return 'מגיע/ה';
  if (status === 'not_attending') return 'לא מגיע/ה';
  return 'אולי';
}

function responseTone(status: AttendanceStatus): 'success' | 'danger' | 'warning' {
  if (status === 'attending') return 'success';
  if (status === 'not_attending') return 'danger';
  return 'warning';
}

function TrackingStatus({ guest }: { readonly guest: PersonalInviteGuest }) {
  const issuedAt = formatTrackingDate(guest.inviteLinkIssuedAt);
  const firstOpenedAt = formatTrackingDate(guest.inviteFirstOpenedAt);
  const lastOpenedAt = formatTrackingDate(guest.inviteLastOpenedAt);
  const responseAt = formatTrackingDate(guest.inviteLastResponseAt);

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
          {guest.inviteOpenCount} פתיחות
          {lastOpenedAt === null ? '' : ` · לאחרונה ${lastOpenedAt}`}
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

export function PersonalInviteSendList({ guests }: { guests: readonly PersonalInviteGuest[] }) {
  return (
    <Card padding="lg">
      <p className="text-eyebrow text-accent-strong font-semibold">קישורים אישיים · אחד-אחד</p>
      <h2 className="text-h2 text-primary mt-2 font-bold">שליחה אישית ב־WhatsApp</h2>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        לכל מוזמן נוצר קישור ייחודי, ושולחים אותו אחד-אחד. כאן רואים אם הקישור נוצר, אם ההזמנה נפתחה
        וכמה פעמים, ומה הייתה הבחירה האחרונה: מגיע/ה, לא מגיע/ה או אולי.
      </p>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        יצירת קישור חדש מבטלת את הקישור הקודם. פתיחה נספרת רק לאחר שהעמוד נטען בדפדפן, כדי שתצוגה
        מקדימה אוטומטית של WhatsApp לא תיחשב לפתיחה.
      </p>

      {guests.length === 0 ? (
        <p className="text-muted-foreground mt-6">הוסיפו מוזמנים כדי לשלוח קישורים אישיים.</p>
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
                <TrackingStatus guest={guest} />
              </div>
              <a
                href={`/share/guest/${guest.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({ variant: 'secondary', size: 'sm' })}
              >
                {guest.inviteLinkIssuedAt === null ? 'שליחת לינק אישי' : 'שליחה מחדש'}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
