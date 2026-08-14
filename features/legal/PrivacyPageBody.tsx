import type { Metadata } from 'next';

import { appConfig } from '@/config/event.config';
import { buildLegalMetadata, LegalPageBody, type LegalContent } from '@/features/legal/LegalPage';
import { type Locale } from '@/lib/i18n';

/**
 * Privacy notice (חוק הגנת הפרטיות התשמ״א-1981, as amended by תיקון 13).
 *
 * Written for the guest who is about to type a phone number, not for a lawyer. The
 * dietary-requirements clause is the one that matters most: "gluten free" discloses a
 * medical condition and "kosher lemehadrin" discloses religious observance, which makes
 * that field sensitive data under Israeli law. The English translation keeps that clause
 * exactly as prominent as the Hebrew.
 */

const CONTENT: Record<Locale, LegalContent> = {
  he: {
    meta: {
      title: 'מדיניות פרטיות',
      description: 'איזה מידע נאסף באתר, לשם מה, כמה זמן הוא נשמר ומה הזכויות שלכם.',
    },
    eyebrow: 'מסמך משפטי',
    title: 'מדיניות פרטיות',
    updated: 'עודכן ביולי 2026',
    sections: [
      {
        title: 'מי אחראי למידע',
        blocks: [
          {
            kind: 'p',
            runs: [
              'האתר מופעל על ידי ',
              { b: 'ניסן סיני טכנולוגיות' },
              '. בעל האירוע שיצר את ההזמנה הוא זה שרואה את התשובות שלכם ומשתמש בהן לארגון האירוע.',
            ],
          },
        ],
      },
      {
        title: 'איזה מידע נאסף',
        blocks: [
          {
            kind: 'ul',
            items: [
              ['שם מלא ומספר טלפון — כדי לדעת מי מגיע וכדי ליצור קשר במידת הצורך'],
              ['מספר המבוגרים, הילדים והתינוקות — לתכנון מקומות ואוכל'],
              ['צד משפחה — לסידור הישיבה'],
              ['דרישות תזונה והערות חופשיות — אם בחרתם למלא אותן'],
              [
                'נתונים טכניים מצומצמים למניעת שימוש לרעה: כתובת ה-IP שלכם ',
                { b: 'נשמרת מגובבת בלבד' },
                ' ולא ניתן לשחזר אותה',
              ],
            ],
          },
        ],
      },
      {
        title: 'דרישות תזונה — מידע רגיש',
        blocks: [
          {
            kind: 'p',
            runs: [
              'שדה דרישות התזונה עשוי להעיד על מצב רפואי (למשל אלרגיה או צליאק) או על אורח חיים דתי. לפי חוק הגנת הפרטיות זהו ',
              { b: 'מידע רגיש' },
              ', והוא מטופל בהתאם:',
            ],
          },
          {
            kind: 'ul',
            items: [
              ['מילוי השדה הוא רשות מלאה — אפשר להשאיר אותו ריק'],
              ['רק בעל האירוע רואה אותו'],
              ['הוא נמחק יחד עם שאר הפרטים בתום תקופת השמירה'],
            ],
          },
        ],
      },
      {
        title: 'למה משמש המידע',
        blocks: [
          {
            kind: 'p',
            runs: [
              'אך ורק לארגון האירוע שאליו נרשמתם. המידע ',
              { b: 'אינו נמכר, אינו מושכר ואינו מועבר' },
              ' לצד שלישי לצורכי שיווק, ולא משמש לפרסום.',
            ],
          },
        ],
      },
      {
        title: 'מי מארח את המידע',
        blocks: [
          {
            kind: 'p',
            runs: [
              'הנתונים שמורים בשרתי ',
              { b: 'Supabase' },
              ' באיחוד האירופי (פרנקפורט), והאתר עצמו רץ על ',
              { b: 'Vercel' },
              '. שני הספקים כפופים ל-GDPR.',
            ],
          },
        ],
      },
      {
        title: 'כמה זמן המידע נשמר',
        blocks: [
          {
            kind: 'p',
            runs: [
              'פרטי האורחים נמחקים או עוברים אנונימיזציה עד ',
              { b: 'שנה' },
              ' ({retention} ימים) לאחר מועד האירוע. רישומי הביקורת נשמרים עד {audit} ימים ואינם כוללים את פרטי הקשר שלכם.',
            ],
          },
          {
            kind: 'p',
            runs: [
              'המחיקה אינה ידנית: משימה מתוזמנת רצה במסד הנתונים מדי לילה, מאתרת אירועים שעברו את תקופת השמירה, ומוחקת מהם את השם, הטלפון, דרישות התזונה וההערות. מספרי המשתתפים נשארים לבעל האירוע בלבד, בלי שום פרט מזהה.',
            ],
          },
        ],
      },
      {
        title: 'הזכויות שלכם',
        blocks: [
          { kind: 'p', runs: ['לפי החוק אתם רשאים:'] },
          {
            kind: 'ul',
            items: [['לעיין במידע שנשמר עליכם'], ['לבקש לתקן מידע שגוי'], ['לבקש למחוק את המידע']],
          },
          {
            kind: 'p',
            runs: [
              'לפנייה בכל אחד מאלה — צרו קשר עם בעל האירוע דרך מספר הטלפון שמופיע בהזמנה, או פנו ישירות אלינו:',
            ],
          },
          { kind: 'contact', emailLabel: 'דוא״ל', phoneLabel: 'טלפון' },
        ],
      },
      {
        title: 'עוגיות',
        blocks: [
          {
            kind: 'p',
            runs: [
              'האתר אינו משתמש בעוגיות פרסום או מעקב. משתמשים שנכנסים לחשבון הניהול מקבלים עוגיות טכניות חיוניות של Supabase, שנועדו לשמור על ההתחברות ולאבטח את החשבון. הן פגות אוטומטית או נמחקות בעת ההתנתקות.',
            ],
          },
          {
            kind: 'p',
            runs: [
              'אורחים שממלאים אישור הגעה דרך קישור האירוע אינם נדרשים להיכנס לחשבון, ולא נשמרת אצלם עוגיית פרסום או מעקב.',
            ],
          },
        ],
      },
    ],
  },
  en: {
    meta: {
      title: 'Privacy policy',
      description:
        'What the site collects, what for, how long it is kept and what your rights are.',
    },
    eyebrow: 'Legal document',
    title: 'Privacy policy',
    updated: 'Last updated July 2026',
    sections: [
      {
        title: 'Who is responsible for the data',
        blocks: [
          {
            kind: 'p',
            runs: [
              'The site is operated by ',
              { b: 'Nisan Sinai Technologies' },
              '. The host who created the invitation is the one who sees your replies and uses them to organise the event.',
            ],
          },
        ],
      },
      {
        title: 'What is collected',
        blocks: [
          {
            kind: 'ul',
            items: [
              ['Full name and phone number — to know who is coming and to reach you if needed'],
              ['The number of adults, children and infants — to plan seating and catering'],
              ['Which side of the family — for the seating plan'],
              ['Dietary requirements and free-text notes — if you choose to fill them in'],
              [
                'A little technical data to prevent abuse: your IP address ',
                { b: 'is stored hashed only' },
                ' and cannot be recovered',
              ],
            ],
          },
        ],
      },
      {
        title: 'Dietary requirements — sensitive data',
        blocks: [
          {
            kind: 'p',
            runs: [
              'The dietary-requirements field may reveal a medical condition (an allergy or coeliac disease, say) or a religious way of life. Under the Privacy Protection Law this is ',
              { b: 'sensitive data' },
              ', and it is handled accordingly:',
            ],
          },
          {
            kind: 'ul',
            items: [
              ['Filling it in is entirely optional — you can leave it blank'],
              ['Only the event host sees it'],
              ['It is deleted with the rest of your details at the end of the retention period'],
            ],
          },
        ],
      },
      {
        title: 'What the data is used for',
        blocks: [
          {
            kind: 'p',
            runs: [
              'Solely to organise the event you signed up for. The data is ',
              { b: 'not sold, not rented and not passed on' },
              ' to any third party for marketing, and is not used for advertising.',
            ],
          },
        ],
      },
      {
        title: 'Where the data is hosted',
        blocks: [
          {
            kind: 'p',
            runs: [
              'The data is stored on ',
              { b: 'Supabase' },
              ' servers in the European Union (Frankfurt), and the site itself runs on ',
              { b: 'Vercel' },
              '. Both providers are subject to the GDPR.',
            ],
          },
        ],
      },
      {
        title: 'How long the data is kept',
        blocks: [
          {
            kind: 'p',
            runs: [
              'Guest details are deleted or anonymised up to ',
              { b: 'a year' },
              ' ({retention} days) after the event date. Audit records are kept for up to {audit} days and never include your contact details.',
            ],
          },
          {
            kind: 'p',
            runs: [
              'Deletion is not manual: a scheduled task runs in the database every night, finds events past their retention period, and strips the name, phone, dietary requirements and notes from them. The headcounts remain for the host alone, with no identifying detail.',
            ],
          },
        ],
      },
      {
        title: 'Your rights',
        blocks: [
          { kind: 'p', runs: ['Under the law you are entitled to:'] },
          {
            kind: 'ul',
            items: [
              ['View the data held about you'],
              ['Ask to correct inaccurate data'],
              ['Ask to delete the data'],
            ],
          },
          {
            kind: 'p',
            runs: [
              'For any of these — contact the event host through the phone number in the invitation, or reach us directly:',
            ],
          },
          { kind: 'contact', emailLabel: 'Email', phoneLabel: 'Phone' },
        ],
      },
      {
        title: 'Cookies',
        blocks: [
          {
            kind: 'p',
            runs: [
              'The site uses no advertising or tracking cookies. Users who sign in to the management account receive essential technical Supabase cookies, which keep the session and secure the account. They expire automatically or are cleared on sign-out.',
            ],
          },
          {
            kind: 'p',
            runs: [
              'Guests who fill in an RSVP through the event link are not required to sign in, and no advertising or tracking cookie is stored on their device.',
            ],
          },
        ],
      },
    ],
  },
};

const PATH = '/privacy';

export function buildPrivacyMetadata(locale: Locale): Metadata {
  return buildLegalMetadata(locale, PATH, CONTENT);
}

export function PrivacyPageBody({ locale }: { locale: Locale }) {
  const tokens = {
    retention: String(appConfig.defaultRetentionDaysAfterEvent),
    audit: String(appConfig.auditLogRetentionDays),
  };
  return <LegalPageBody locale={locale} content={CONTENT} tokens={tokens} />;
}
