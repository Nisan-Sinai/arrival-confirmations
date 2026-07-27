import type { Metadata } from 'next';

import { Container, Rule } from '@/components/ui/layout';
import { appConfig } from '@/config/event.config';
import { SiteHeader } from '@/features/layout/SiteHeader';

/**
 * Accessibility statement.
 *
 * Required by תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות),
 * תשע״ג-2013, which adopts תקן ישראלי 5568. Conformance alone does not satisfy the
 * regulation — a published statement naming the level, the known limitations and a
 * contact for problems is a separate obligation, and the one most often skipped.
 *
 * Everything claimed here is verified by the axe scan in `e2e/invitation.spec.ts`,
 * which §9 makes a hard gate at zero violations. Nothing is asserted that no test
 * covers.
 */

export const metadata: Metadata = {
  title: 'הצהרת נגישות',
  description: 'רמת הנגישות של האתר, ההתאמות שבוצעו, מגבלות ידועות ודרכי פנייה.',
};

/** One clause, matched to the privacy notice so the two legal pages read as a pair. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-border mt-10 border-t pt-8 first:mt-0 first:border-t-0 first:pt-0">
      <h2 className="text-primary text-h3 font-semibold">{title}</h2>
      <div className="text-foreground mt-3.5 space-y-3.5 leading-[1.75]">{children}</div>
    </section>
  );
}

export default function AccessibilityPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 py-12 sm:py-16">
        <Container width="prose">
          <p className="text-eyebrow text-accent-strong font-semibold">מסמך משפטי</p>
          <h1 className="text-h1 text-primary mt-3 font-bold">הצהרת נגישות</h1>
          <p className="text-muted-foreground mt-3 text-sm">עודכן ביולי 2026</p>
          <Rule className="mt-8 mb-10" />

          <Section title="המחויבות שלנו">
            <p>
              הזמנה לאירוע נשלחת לכל המשפחה — כולל מבוגרים, אנשים עם לקות ראייה ומי שמתקשה בהפעלת
              מסך מגע. אתר שחלקם לא יכולים למלא בו טופס פשוט אינו עושה את עבודתו. לכן הנגישות כאן
              היא חלק מהמוצר ולא תוספת.
            </p>
          </Section>

          <Section title="רמת ההתאמה">
            <p>
              האתר עומד בתקן הישראלי <strong>ת״י 5568</strong> ברמה <strong>AA</strong>, המבוסס על
              הנחיות <strong>WCAG</strong>. בפועל האתר נבדק מול הגרסה המחמירה יותר,{' '}
              <strong>WCAG 2.2 רמה AA</strong>.
            </p>
          </Section>

          <Section title="מה בוצע בפועל">
            <ul className="list-inside list-disc space-y-1">
              <li>מבנה HTML סמנטי, עם כותרת ראשית אחת בכל עמוד והיררכיית כותרות תקינה</li>
              <li>הגדרת שפה עברית וכיוון ימין-לשמאל ברמת המסמך</li>
              <li>תווית מקושרת לכל שדה טופס, והודעות שגיאה שמוכרזות לקורא מסך</li>
              <li>ניווט מלא במקלדת, עם קישור דילוג לתוכן כפריט הראשון בסדר המעבר</li>
              <li>מצב פוקוס נראה לעין על כל רכיב אינטראקטיבי</li>
              <li>כל האיורים הדקורטיביים מוסתרים מטכנולוגיה מסייעת, כדי לא להעמיס רעש</li>
              <li>יחסי ניגודיות תקינים בין טקסט לרקע</li>
              <li>כיבוד העדפת המשתמש להפחתת אנימציות</li>
              <li>תצוגה תקינה בזום 200% ובמסכי טלפון צרים</li>
              <li>טבלת הניהול הופכת לכרטיסים בנייד במקום לחייב גלילה לרוחב</li>
            </ul>
          </Section>

          <Section title="איך זה נבדק">
            <p>
              בכל שינוי בקוד רצה סריקת <strong>axe-core</strong> אוטומטית על עמודי האתר, ותקלה אחת
              מספיקה כדי לחסום את הפרסום. הבדיקה כוללת גם מעבר במקלדת בלבד ואימות של הצהרת השפה
              והכיוון.
            </p>
          </Section>

          <Section title="מגבלות ידועות">
            <p>
              תוכן שמזין בעל האירוע — שם האולם, הערות, תיאור — אינו בשליטתנו. אם הוא נכתב באופן
              שאינו ברור, ההצגה תהיה נגישה טכנית אך הניסוח לא. אנו ממליצים לבעלי אירועים לכתוב
              בפשטות.
            </p>
            <p>
              האתר לא נבדק מול כל צירוף אפשרי של דפדפן וקורא מסך. אם נתקלתם בקושי — נשמח לשמוע
              ונתקן.
            </p>
          </Section>

          <Section title="פנייה בנושא נגישות">
            <p>
              נתקלתם בבעיה, או שיש לכם הצעה לשיפור? פנו אלינו ונטפל בפנייה. אם הבעיה מונעת מכם לאשר
              הגעה, ניתן גם ליצור קשר ישירות עם בעל האירוע דרך מספר הטלפון שמופיע בהזמנה.
            </p>
            {/* תקנות שוויון זכויות require the statement to name a route to the
                accessibility coordinator, not merely to name the coordinator. Both
                channels are listed because a visitor who cannot use the site may not
                be able to use an email client either. */}
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
            <p className="text-muted-foreground text-sm">
              רכז נגישות: ניסן סיני טכנולוגיות · הפנייה תיענה בהקדם האפשרי.
            </p>
          </Section>
        </Container>
      </main>
    </>
  );
}
