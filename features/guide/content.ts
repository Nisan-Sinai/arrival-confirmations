import type { Locale } from '@/lib/i18n';

type GuideContent = {
  title: string;
  description: string;
  intro: string;
  sections: readonly { title: string; body: string }[];
  pricingLink: string;
  privacyLink: string;
  homeLink: string;
};

/** Public product guidance only. Never add real event or guest data here. */
export const guideContent: Record<Locale, GuideContent> = {
  he: {
    title: 'מדריך לניהול אישורי הגעה לאירוע',
    description:
      'איך מכינים הזמנה דיגיטלית, משתפים ב-WhatsApp ועוקבים אחרי תשובות במערכת אישורי ההגעה של ניסן סיני טכנולוגיות.',
    intro:
      'אישורי הגעה היא מערכת אינטרנטית של ניסן סיני טכנולוגיות לניהול הזמנות ומוזמנים. השירות מיועד לקהל הישראלי, עם תמיכה בעברית ובאנגלית. בעלי האירוע מנהלים את הרשימה בחשבון שלהם; האורחים עונים דרך קישור, ללא הרשמה וללא התקנת אפליקציה.',
    sections: [
      {
        title: 'מה להכין לפני שיוצרים אירוע?',
        body: 'הכינו את סוג האירוע, התאריך, השעה ופרטי המקום. בדקו ששם המקום וקישורי הניווט נכונים, ותנו לאדם נוסף לעבור על ההזמנה בטלפון לפני שמפיצים אותה. המערכת מציגה הזמנה דיגיטלית עם תאריך עברי, ספירה לאחור וקישורי Waze ו-Google Maps.',
      },
      {
        title: 'איך משתפים הזמנות ב-WhatsApp?',
        body: 'אפשר להעתיק או לשתף את קישור האירוע. במסלולי Premium ו-Pro קיים מרכז שליחה עם הודעה וקישור אישי לכל מוזמן. במצב השליחה הידני פותחים את WhatsApp ושולחים כל הודעה בעצמכם. שליחה אוטומטית מהמספר המרכזי תלויה בהפעלת WhatsApp Business במערכת; אין להניח שהיא פעילה בכל אירוע. שלחו הזמנות רק לאנשים שאליהם התכוונתם לפנות.',
      },
      {
        title: 'איך עוקבים אחרי תשובות ומכינים רשימה?',
        body: 'בדשבורד מרכזים את אישורי ההגעה, מספר המבוגרים והילדים, דרישות התזונה וההערות. עברו על מי שעדיין לא השיב לפני שליחת תזכורת. Basic כולל הזנה ידנית וייצוא בסיסי; Premium ו-Pro כוללים ייבוא Excel, CSV ו-TSV וכלי ניהול נוספים, בהתאם למסלול.',
      },
      {
        title: 'איך בוחרים בין המסלולים?',
        body: 'בדקו את מספר המוזמנים ואת הכלים הדרושים לכם: אישורי הגעה, ייבוא רשימה, מיתוג או סידור שולחנות. Premium כולל מפת שולחנות ומושבים בסיסית, ו-Pro כולל סטודיו הושבה מתקדם. המחיר והמגבלות העדכניים מופיעים בעמוד המסלולים. התשלום הוא חד-פעמי לאירוע; הפעלת מסלול בתשלום נעשית לאחר הסדרת תשלום מול התמיכה.',
      },
      {
        title: 'אילו פרטים כדאי לשמור פרטיים?',
        body: 'קישורי הזמנה אישיים מיועדים למוזמנים שקיבלו אותם. אל תפרסמו אותם או רשימות עם שמות, מספרי טלפון, הערות וצרכי נגישות ברשתות ציבוריות. עמודי האירועים והניהול אינם חלק ממפת האתר או מקובצי המידע הציבוריים למנועי AI. קראו את מדיניות הפרטיות לפני הזנת פרטי מוזמנים.',
      },
    ],
    pricingLink: 'השוואת מסלולים, מחירים ומגבלות',
    privacyLink: 'מדיניות פרטיות ושמירת מידע',
    homeLink: 'אישורי הגעה — דף הבית',
  },
  en: {
    title: 'A guide to managing event RSVPs',
    description:
      'Prepare a digital invitation, share it on WhatsApp and track replies with Arrival Confirmations by Nisan Sinai Technologies.',
    intro:
      'Arrival Confirmations is a web application by Nisan Sinai Technologies for managing event invitations and guest lists. It serves an Israeli audience in Hebrew and English. Hosts manage their list in their account; guests reply through a link without creating an account or installing an app.',
    sections: [
      {
        title: 'What should you prepare before creating an event?',
        body: 'Have the event type, date, time and venue details ready. Check the venue name and navigation links, then ask someone else to review the invitation on a phone before sharing it. The digital invitation supports a Hebrew date, countdown, Waze and Google Maps links.',
      },
      {
        title: 'How do you share invitations on WhatsApp?',
        body: 'Copy or share the event link. Premium and Pro include a send centre with a prepared message and personal RSVP link for each guest. In manual mode, open WhatsApp and send each message yourself. Automatic sending from the central number depends on WhatsApp Business being enabled on the platform; do not assume it is active for every event. Send invitations only to the people you intend to contact.',
      },
      {
        title: 'How do you track replies and prepare a guest list?',
        body: 'The dashboard brings together RSVPs, adult and child counts, dietary needs and notes. Review guests who have not replied before sending a reminder. Basic includes manual entry and basic export; Premium and Pro include Excel, CSV and TSV import and further management tools, depending on the plan.',
      },
      {
        title: 'How should you choose a plan?',
        body: 'Consider your guest count and the tools you need: RSVPs, file import, branding or seating. Premium has a basic tables-and-seating map; Pro has an advanced seating studio. The plans page lists current prices and limits. Payment is once per event; support activates a paid plan after payment is arranged.',
      },
      {
        title: 'Which information should stay private?',
        body: 'Personal invitation links are intended for their recipients. Do not post those links or lists containing names, phone numbers, notes or accessibility needs publicly. Event and management pages are excluded from the sitemap and public AI information files. Read the privacy policy before entering guest information.',
      },
    ],
    pricingLink: 'Compare plans, prices and limits',
    privacyLink: 'Privacy and data retention policy',
    homeLink: 'Arrival Confirmations — home',
  },
};
