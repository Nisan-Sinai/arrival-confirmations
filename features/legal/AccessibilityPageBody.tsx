import type { Metadata } from 'next';

import { buildLegalMetadata, LegalPageBody, type LegalContent } from '@/features/legal/LegalPage';
import { type Locale } from '@/lib/i18n';

/**
 * Accessibility statement.
 *
 * Required by תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות),
 * תשע״ג-2013, which adopts תקן ישראלי 5568. Conformance alone does not satisfy the
 * regulation — a published statement naming the level, the known limitations and a
 * contact for problems is a separate obligation. Everything claimed here is verified by
 * the axe scan that §9 makes a hard gate at zero violations.
 */

const CONTENT: Record<Locale, LegalContent> = {
  he: {
    meta: {
      title: 'הצהרת נגישות',
      description: 'רמת הנגישות של האתר, ההתאמות שבוצעו, מגבלות ידועות ודרכי פנייה.',
    },
    eyebrow: 'מסמך משפטי',
    title: 'הצהרת נגישות',
    updated: 'עודכן ביולי 2026',
    sections: [
      {
        title: 'המחויבות שלנו',
        blocks: [
          {
            kind: 'p',
            runs: [
              'הזמנה לאירוע נשלחת לכל המשפחה — כולל מבוגרים, אנשים עם לקות ראייה ומי שמתקשה בהפעלת מסך מגע. אתר שחלקם לא יכולים למלא בו טופס פשוט אינו עושה את עבודתו. לכן הנגישות כאן היא חלק מהמוצר ולא תוספת.',
            ],
          },
        ],
      },
      {
        title: 'רמת ההתאמה',
        blocks: [
          {
            kind: 'p',
            runs: [
              'האתר עומד בתקן הישראלי ',
              { b: 'ת״י 5568' },
              ' ברמה ',
              { b: 'AA' },
              ', המבוסס על הנחיות ',
              { b: 'WCAG' },
              '. בפועל האתר נבדק מול הגרסה המחמירה יותר, ',
              { b: 'WCAG 2.2 רמה AA' },
              '.',
            ],
          },
        ],
      },
      {
        title: 'מה בוצע בפועל',
        blocks: [
          {
            kind: 'ul',
            items: [
              ['מבנה HTML סמנטי, עם כותרת ראשית אחת בכל עמוד והיררכיית כותרות תקינה'],
              ['הגדרת שפה עברית וכיוון ימין-לשמאל ברמת המסמך'],
              ['תווית מקושרת לכל שדה טופס, והודעות שגיאה שמוכרזות לקורא מסך'],
              ['ניווט מלא במקלדת, עם קישור דילוג לתוכן כפריט הראשון בסדר המעבר'],
              ['מצב פוקוס נראה לעין על כל רכיב אינטראקטיבי'],
              ['כל האיורים הדקורטיביים מוסתרים מטכנולוגיה מסייעת, כדי לא להעמיס רעש'],
              ['יחסי ניגודיות תקינים בין טקסט לרקע'],
              ['כיבוד העדפת המשתמש להפחתת אנימציות'],
              ['תצוגה תקינה בזום 200% ובמסכי טלפון צרים'],
              ['טבלת הניהול הופכת לכרטיסים בנייד במקום לחייב גלילה לרוחב'],
            ],
          },
        ],
      },
      {
        title: 'איך זה נבדק',
        blocks: [
          {
            kind: 'p',
            runs: [
              'בכל שינוי בקוד רצה סריקת ',
              { b: 'axe-core' },
              ' אוטומטית על עמודי האתר, ותקלה אחת מספיקה כדי לחסום את הפרסום. הבדיקה כוללת גם מעבר במקלדת בלבד ואימות של הצהרת השפה והכיוון.',
            ],
          },
        ],
      },
      {
        title: 'מגבלות ידועות',
        blocks: [
          {
            kind: 'p',
            runs: [
              'תוכן שמזין בעל האירוע — שם האולם, הערות, תיאור — אינו בשליטתנו. אם הוא נכתב באופן שאינו ברור, ההצגה תהיה נגישה טכנית אך הניסוח לא. אנו ממליצים לבעלי אירועים לכתוב בפשטות.',
            ],
          },
          {
            kind: 'p',
            runs: [
              'האתר לא נבדק מול כל צירוף אפשרי של דפדפן וקורא מסך. אם נתקלתם בקושי — נשמח לשמוע ונתקן.',
            ],
          },
        ],
      },
      {
        title: 'פנייה בנושא נגישות',
        blocks: [
          {
            kind: 'p',
            runs: [
              'נתקלתם בבעיה, או שיש לכם הצעה לשיפור? פנו אלינו ונטפל בפנייה. אם הבעיה מונעת מכם לאשר הגעה, ניתן גם ליצור קשר ישירות עם בעל האירוע דרך מספר הטלפון שמופיע בהזמנה.',
            ],
          },
          { kind: 'contact', emailLabel: 'דוא״ל', phoneLabel: 'טלפון' },
          {
            kind: 'note',
            runs: ['רכז נגישות: ניסן סיני טכנולוגיות · הפנייה תיענה בהקדם האפשרי.'],
          },
        ],
      },
    ],
  },
  en: {
    meta: {
      title: 'Accessibility statement',
      description:
        'The accessibility level of the site, the adjustments made, known limitations and how to get in touch.',
    },
    eyebrow: 'Legal document',
    title: 'Accessibility statement',
    updated: 'Last updated July 2026',
    sections: [
      {
        title: 'Our commitment',
        blocks: [
          {
            kind: 'p',
            runs: [
              'An event invitation goes to the whole family — including older people, people with a visual impairment and anyone who struggles with a touch screen. A site some of them cannot fill a simple form on is not doing its job. Accessibility here is part of the product, not an add-on.',
            ],
          },
        ],
      },
      {
        title: 'Conformance level',
        blocks: [
          {
            kind: 'p',
            runs: [
              'The site meets the Israeli standard ',
              { b: 'SI 5568' },
              ' at level ',
              { b: 'AA' },
              ', which is based on the ',
              { b: 'WCAG' },
              ' guidelines. In practice it is tested against the stricter ',
              { b: 'WCAG 2.2 level AA' },
              '.',
            ],
          },
        ],
      },
      {
        title: 'What was actually done',
        blocks: [
          {
            kind: 'ul',
            items: [
              ['Semantic HTML, with one main heading per page and a correct heading hierarchy'],
              ['Hebrew language and right-to-left direction set at the document level'],
              ['A label tied to every form field, and error messages announced to a screen reader'],
              ['Full keyboard navigation, with a skip-to-content link first in the tab order'],
              ['A visible focus state on every interactive element'],
              ['All decorative illustrations hidden from assistive technology, to avoid noise'],
              ['Adequate contrast ratios between text and background'],
              ["Respect for the user's reduced-motion preference"],
              ['Correct display at 200% zoom and on narrow phone screens'],
              ['The management table becomes cards on mobile instead of forcing horizontal scroll'],
            ],
          },
        ],
      },
      {
        title: 'How it is tested',
        blocks: [
          {
            kind: 'p',
            runs: [
              'On every change to the code an ',
              { b: 'axe-core' },
              ' scan runs automatically over the site’s pages, and a single violation is enough to block release. The check also includes keyboard-only navigation and verifies the language and direction declaration.',
            ],
          },
        ],
      },
      {
        title: 'Known limitations',
        blocks: [
          {
            kind: 'p',
            runs: [
              'Content the host enters — the venue name, notes, a description — is not under our control. If it is written unclearly, the presentation will be technically accessible but the wording will not. We advise hosts to write plainly.',
            ],
          },
          {
            kind: 'p',
            runs: [
              'The site has not been tested against every possible combination of browser and screen reader. If you run into a difficulty — we would be glad to hear and to fix it.',
            ],
          },
        ],
      },
      {
        title: 'Getting in touch about accessibility',
        blocks: [
          {
            kind: 'p',
            runs: [
              'Run into a problem, or have a suggestion? Get in touch and we will handle it. If the problem stops you confirming attendance, you can also contact the event host directly through the phone number in the invitation.',
            ],
          },
          { kind: 'contact', emailLabel: 'Email', phoneLabel: 'Phone' },
          {
            kind: 'note',
            runs: [
              'Accessibility coordinator: Nisan Sinai Technologies · enquiries answered as soon as possible.',
            ],
          },
        ],
      },
    ],
  },
};

const PATH = '/accessibility';

export function buildAccessibilityMetadata(locale: Locale): Metadata {
  return buildLegalMetadata(locale, PATH, CONTENT);
}

export function AccessibilityPageBody({ locale }: { locale: Locale }) {
  return <LegalPageBody locale={locale} content={CONTENT} />;
}
