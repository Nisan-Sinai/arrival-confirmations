import type { Metadata } from 'next';

import { Container, Rule } from '@/components/ui/layout';
import { appConfig } from '@/config/event.config';
import { SiteHeader } from '@/features/layout/SiteHeader';

/**
 * Privacy notice (חוק הגנת הפרטיות התשמ״א-1981, as amended by תיקון 13).
 *
 * Written for the guest who is about to type a phone number, not for a lawyer. The
 * dietary-requirements paragraph is the one that matters most: "gluten free"
 * discloses a medical condition and "kosher lemehadrin" discloses religious
 * observance, which makes that field sensitive data under Israeli law. A notice that
 * buried it among the other fields would be technically complete and practically
 * useless.
 */

export const metadata: Metadata = {
  title: 'מדיניות פרטיות',
  description: 'איזה מידע נאסף באתר, לשם מה, כמה זמן הוא נשמר ומה הזכויות שלכם.',
  alternates: { canonical: '/privacy' },
};

const RETENTION_DAYS = appConfig.defaultRetentionDaysAfterEvent;

/**
 * One clause, separated by a rule rather than by whitespace alone. A privacy notice is
 * scanned for the one paragraph that answers a question, so the boundaries between
 * clauses have to be visible at a glance rather than inferred from spacing.
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-border mt-10 border-t pt-8 first:mt-0 first:border-t-0 first:pt-0">
      <h2 className="text-primary text-h3 font-semibold">{title}</h2>
      <div className="text-foreground mt-3.5 space-y-3.5 leading-[1.75]">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 py-12 sm:py-16">
        <Container width="prose">
          <p className="text-eyebrow text-accent-strong font-semibold">מסמך משפטי</p>
          <h1 className="text-h1 text-primary mt-3 font-bold">מדיניות פרטיות</h1>
          <p className="text-muted-foreground mt-3 text-sm">עודכן ביולי 2026</p>
          <Rule className="mt-8 mb-10" />

          <Section title="מי אחראי למידע">
            <p>
              האתר מופעל על ידי <strong>ניסן סיני טכנולוגיות</strong>. בעל האירוע שיצר את ההזמנה הוא
              זה שרואה את התשובות שלכם ומשתמש בהן לארגון האירוע.
            </p>
          </Section>

          <Section title="איזה מידע נאסף">
            <ul className="list-inside list-disc space-y-1">
              <li>שם מלא ומספר טלפון — כדי לדעת מי מגיע וכדי ליצור קשר במידת הצורך</li>
              <li>מספר המבוגרים, הילדים והתינוקות — לתכנון מקומות ואוכל</li>
              <li>צד משפחה — לסידור הישיבה</li>
              <li>דרישות תזונה והערות חופשיות — אם בחרתם למלא אותן</li>
              <li>
                נתונים טכניים מצומצמים למניעת שימוש לרעה: כתובת ה-IP שלכם{' '}
                <strong>נשמרת מגובבת בלבד</strong> ולא ניתן לשחזר אותה
              </li>
            </ul>
          </Section>

          <Section title="דרישות תזונה — מידע רגיש">
            <p>
              שדה דרישות התזונה עשוי להעיד על מצב רפואי (למשל אלרגיה או צליאק) או על אורח חיים דתי.
              לפי חוק הגנת הפרטיות זהו <strong>מידע רגיש</strong>, והוא מטופל בהתאם:
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>מילוי השדה הוא רשות מלאה — אפשר להשאיר אותו ריק</li>
              <li>רק בעל האירוע רואה אותו</li>
              <li>הוא נמחק יחד עם שאר הפרטים בתום תקופת השמירה</li>
            </ul>
          </Section>

          <Section title="למה משמש המידע">
            <p>
              אך ורק לארגון האירוע שאליו נרשמתם. המידע{' '}
              <strong>אינו נמכר, אינו מושכר ואינו מועבר</strong> לצד שלישי לצורכי שיווק, ולא משמש
              לפרסום.
            </p>
          </Section>

          <Section title="מי מארח את המידע">
            <p>
              הנתונים שמורים בשרתי <strong>Supabase</strong> באיחוד האירופי (פרנקפורט), והאתר עצמו
              רץ על <strong>Vercel</strong>. שני הספקים כפופים ל-GDPR.
            </p>
          </Section>

          <Section title="כמה זמן המידע נשמר">
            <p>
              פרטי האורחים נמחקים או עוברים אנונימיזציה עד <strong>שנה</strong> ({RETENTION_DAYS}{' '}
              ימים) לאחר מועד האירוע. רישומי הביקורת נשמרים עד {appConfig.auditLogRetentionDays}{' '}
              ימים ואינם כוללים את פרטי הקשר שלכם.
            </p>
            {/* The mechanism is named because §14 asks for a documented process, and
                because "we delete it eventually" is what everyone writes. */}
            <p>
              המחיקה אינה ידנית: משימה מתוזמנת רצה במסד הנתונים מדי לילה, מאתרת אירועים שעברו את
              תקופת השמירה, ומוחקת מהם את השם, הטלפון, דרישות התזונה וההערות. מספרי המשתתפים נשארים
              לבעל האירוע בלבד, בלי שום פרט מזהה.
            </p>
          </Section>

          <Section title="הזכויות שלכם">
            <p>לפי החוק אתם רשאים:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>לעיין במידע שנשמר עליכם</li>
              <li>לבקש לתקן מידע שגוי</li>
              <li>לבקש למחוק את המידע</li>
            </ul>
            <p>
              לפנייה בכל אחד מאלה — צרו קשר עם בעל האירוע דרך מספר הטלפון שמופיע בהזמנה, או פנו
              ישירות אלינו:
            </p>
            {/* The notice told guests to "write to us" and gave them nothing to write
                to. חוק הגנת הפרטיות requires a reachable route to the controller, so
                the address and the number are stated here rather than implied. */}
            <ul className="list-inside list-disc space-y-1">
              <li>
                דוא״ל:{' '}
                <a
                  className="text-primary font-semibold underline underline-offset-2"
                  href={`mailto:${appConfig.supportEmail}`}
                  dir="ltr"
                >
                  {appConfig.supportEmail}
                </a>
              </li>
              <li>
                טלפון:{' '}
                <a
                  className="text-primary font-semibold underline underline-offset-2"
                  href={`tel:${appConfig.supportPhone.replace(/[^\d+]/g, '')}`}
                  dir="ltr"
                >
                  {appConfig.supportPhone}
                </a>
              </li>
            </ul>
          </Section>

          <Section title="עוגיות">
            <p>
              האתר אינו משתמש בעוגיות פרסום או מעקב. עוגייה טכנית אחת נשמרת כשמשתמשים בקישור הזמנה
              אישי, כדי לזהות שאתם מי שקיבל אותו. היא נמחקת מעצמה.
            </p>
          </Section>
        </Container>
      </main>
    </>
  );
}
