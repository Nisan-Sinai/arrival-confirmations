import type { Metadata } from 'next';

import { appConfig } from '@/config/event.config';

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
};

const RETENTION_DAYS = appConfig.defaultRetentionDaysAfterEvent;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-primary text-xl font-semibold">{title}</h2>
      <div className="text-foreground mt-3 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <h1 className="text-primary font-[family-name:var(--font-display)] text-3xl font-bold">
        מדיניות פרטיות
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">עודכן ביולי 2026</p>

      <Section title="מי אחראי למידע">
        <p>
          האתר מופעל על ידי <strong>ניסן סיני טכנולוגיות</strong>. בעל האירוע שיצר את ההזמנה הוא זה
          שרואה את התשובות שלכם ומשתמש בהן לארגון האירוע.
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
          שדה דרישות התזונה עשוי להעיד על מצב רפואי (למשל אלרגיה או צליאק) או על אורח חיים דתי. לפי
          חוק הגנת הפרטיות זהו <strong>מידע רגיש</strong>, והוא מטופל בהתאם:
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
          הנתונים שמורים בשרתי <strong>Supabase</strong> באיחוד האירופי (פרנקפורט), והאתר עצמו רץ על{' '}
          <strong>Vercel</strong>. שני הספקים כפופים ל-GDPR.
        </p>
      </Section>

      <Section title="כמה זמן המידע נשמר">
        <p>
          פרטי האורחים נמחקים או עוברים אנונימיזציה עד <strong>{RETENTION_DAYS} ימים</strong> לאחר
          מועד האירוע. רישומי הביקורת נשמרים עד {appConfig.auditLogRetentionDays} ימים ואינם כוללים
          את פרטי הקשר שלכם.
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
          לפנייה בכל אחד מאלה — צרו קשר עם בעל האירוע דרך מספר הטלפון שמופיע בהזמנה, או כתבו אלינו.
        </p>
      </Section>

      <Section title="עוגיות">
        <p>
          האתר אינו משתמש בעוגיות פרסום או מעקב. עוגייה טכנית אחת נשמרת כשמשתמשים בקישור הזמנה אישי,
          כדי לזהות שאתם מי שקיבל אותו. היא נמחקת מעצמה.
        </p>
      </Section>
    </main>
  );
}
