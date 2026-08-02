import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function PersonalInviteSendList({
  guests,
}: {
  guests: readonly { id: string; fullName: string; phone: string }[];
}) {
  return (
    <Card padding="lg">
      <p className="text-eyebrow text-accent-strong font-semibold">קישורים אישיים</p>
      <h2 className="text-h2 text-primary mt-2 font-bold">שליחה אישית ב־WhatsApp</h2>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        כל לחיצה יוצרת לאותו מוזמן קישור ייחודי חדש, מבטלת את הקישור הקודם ופותחת הודעת WhatsApp
        מוכנה. האורח רואה רק מגיע/ה, לא מגיע/ה או אולי.
      </p>

      {guests.length === 0 ? (
        <p className="text-muted-foreground mt-6">הוסיפו מוזמנים כדי לשלוח קישורים אישיים.</p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {guests.map((guest) => (
            <li
              key={guest.id}
              className="border-border flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
            >
              <div>
                <p className="text-primary font-semibold">{guest.fullName}</p>
                <p className="text-muted-foreground mt-1 text-sm" dir="ltr">
                  {guest.phone}
                </p>
              </div>
              <a
                href={`/share/guest/${guest.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({ variant: 'secondary', size: 'sm' })}
              >
                שליחת לינק אישי
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
