import { getPlanCatalog } from '@/app/_lib/plans';
import { appConfig } from '@/config/event.config';
import { localePath, type Locale } from '@/lib/i18n';

export type AssistantContext = 'site' | 'event' | 'guests' | 'invitation' | 'pricing';
export type AssistantLink = { label: string; href: string };
export type PublicGuideGeneration = {
  locale: Locale;
  facts: string;
  format: 'concise' | 'steps';
};

type Article = {
  id: string;
  terms: readonly string[];
  contexts?: readonly AssistantContext[];
  answer: Record<Locale, string>;
  link?: { path: string; he: string; en: string };
};

// These are the only facts allowed into the public AI prompt. Visitor text,
// conversation history and private event data never enter that prompt.
const articles: readonly Article[] = [
  {
    id: 'setup',
    terms: [
      'אירוע חדש',
      'ליצור אירוע',
      'ליצר אירוע',
      'פותחים אירוע',
      'עורכים אירוע',
      'להתחיל',
      'מתחילים',
      'יוצרים אירוע',
      'יצירת אירוע',
      'לפתוח אירוע',
      'הרשמ',
      'מתחיל',
      'לערוך אירוע',
      'עריכת אירוע',
      'create event',
      'sign up',
      'get started',
      'edit event',
    ],
    answer: {
      he: 'התחברו או הירשמו, פתחו את הדשבורד ולחצו על יצירת אירוע חדש. מלאו את פרטי האירוע, שמרו, ופרסמו את ההזמנה לפני שיתוף הקישור. אירוע קיים אפשר לערוך מהדשבורד.',
      en: 'Sign in or create an account, then choose New event in the dashboard. Fill in the event details, save, and publish the invitation before sharing its link. You can edit an existing event from the dashboard.',
    },
    link: { path: '/dashboard/events/new', he: 'יצירת אירוע', en: 'Create an event' },
  },
  {
    id: 'edit',
    terms: [
      'לערוך את האירוע',
      'עורכים את האירוע',
      'לשנות את האירוע',
      'לשנות את התאריך',
      'לשנות את השעה',
      'לשנות את המקום',
      'פרטי האירוע',
      'עריכה',
      'edit the event',
      'event details',
      'change the date',
    ],
    contexts: ['event'],
    answer: {
      he: 'בדשבורד, בכרטיס האירוע, לחצו על ״עריכה״. עדכנו את הפרטים — תאריך, שעה, מקום, כתובת או הערה לאורחים — ושמרו. שם אפשר גם לבטל את פרסום ההזמנה.',
      en: 'In the dashboard, choose Edit on the event card. Update the details — date, time, venue, address or a note for guests — and save. You can also unpublish the invitation there.',
    },
    link: { path: '/dashboard', he: 'האירועים שלי', en: 'My events' },
  },
  {
    id: 'branding',
    terms: [
      'עיצוב',
      'לעצב',
      'מיתוג',
      'לוגו',
      'צבע',
      'סגנון',
      'design',
      'branding',
      'logo',
      'colour',
      'color',
      'style',
    ],
    contexts: ['event', 'guests'],
    answer: {
      he: 'ב־Premium וב־Pro יש מיתוג מתקדם להזמנה עם לוגו, צבעים וסגנונות. הכלים נמצאים ב״מוזמנים וכלים״ של האירוע.',
      en: 'Premium and Pro include advanced invitation branding with a logo, colours and styles. Find it under Guests and tools for your event.',
    },
    link: { path: '/pricing', he: 'השוואת מסלולים', en: 'Compare plans' },
  },
  {
    id: 'sharing',
    terms: [
      'קישור',
      'שיתו',
      'הזמנה אישית',
      'שולח',
      'שליח',
      'וואטסאפ',
      'ווטסאפ',
      'ווצאפ',
      'וואצאפ',
      'אוטומט',
      'לכולם',
      'תזכור',
      'whatsapp',
      'share',
      'invite',
      'send',
      'reminder',
    ],
    contexts: ['event', 'guests'],
    answer: {
      he: 'בעמוד האירוע אפשר להעתיק או לשתף את הקישור הציבורי. באירוע Premium או Pro, ב״מוזמנים וכלים״ יש מרכז שליחה עם קישור אישי לכל מוזמן. כשהשליחה דרך WhatsApp Business מופעלת במערכת, אפשר לשלוח אוטומטית הזמנות, תזכורות ועדכונים מהמספר המרכזי, בלי לפתוח את WhatsApp במכשיר; עד אז פותחים WhatsApp ושולחים כל הודעה בעצמכם.',
      en: 'Copy or share the public link from the event page. On a Premium or Pro event, Guests and tools has a send centre with a personal RSVP link for every guest. Once WhatsApp Business sending is enabled on the platform, you can automatically send invitations, reminders and updates from the central number without opening WhatsApp on your device; until then you open WhatsApp and send each message yourself.',
    },
    link: { path: '/dashboard', he: 'האירועים שלי', en: 'My events' },
  },
  {
    id: 'rsvp_update',
    terms: [
      'משנים תשובה',
      'לשנות תשובה',
      'שיניתי את דעתי',
      'התחרטתי',
      'לעדכן תשובה',
      'מעדכנים תשובה',
      'טעיתי בתשובה',
      'שינוי תשובה',
      'עדכון תשובה',
      'לשנות אישור',
      'טעיתי',
      'לתקן',
      'מספר האנשים',
      'change my answer',
      'made a mistake',
      'wrong number',
      'changed my mind',
      'edit my rsvp',
      'change answer',
      'update rsvp',
    ],
    contexts: ['invitation'],
    answer: {
      he: 'אם השבתם דרך קישור אישי, פתחו אותו שוב ובחרו תשובה חדשה. אם הקישור אינו תקין או שלא מוצגת אפשרות לעדכן, פנו לבעל האירוע.',
      en: 'If you used a personal link, open it again and choose a new response. If the link is invalid or no update option appears, contact the event host.',
    },
  },
  {
    id: 'rsvp',
    terms: [
      'אישור הגעה',
      'אישורי הגעה',
      'לאשר הגעה',
      'מאשר',
      'מאשרים',
      'מגיע',
      'נרשמים',
      'כמות אנשים',
      'תשוב',
      'rsvp',
      'reply',
      'attendance',
      'confirm',
    ],
    contexts: ['invitation', 'event'],
    answer: {
      he: 'פתחו את קישור ההזמנה ומלאו את אזור אישור ההגעה. בהזמנה אישית בוחרים מגיעים, לא מגיעים או מתלבטים ואת מספר האנשים; בקישור ציבורי ממלאים את הטופס. בעל האירוע רואה את התשובות בדשבורד. אם הקישור האישי אינו תקין, בקשו מבעל האירוע קישור חדש.',
      en: 'Open the invitation link and use its RSVP section. A personal link lets you choose attending, declined or maybe and the number of people; the public link has an RSVP form. The host sees replies in the dashboard. Ask the host for a new link if your personal link is invalid.',
    },
    link: { path: '/dashboard', he: 'צפייה באישורי הגעה', en: 'View RSVPs' },
  },
  {
    id: 'guests',
    terms: [
      'מוזמנ',
      'מוזמן',
      'אנשי קשר',
      'ייבוא',
      'יבוא',
      'לייבא',
      'מייבאים',
      'אקסל',
      'csv',
      'מחיק',
      'למחוק',
      'מוחקים',
      'למחוק אורחים',
      'guest',
      'contact',
      'import',
      'excel',
      'delete',
    ],
    contexts: ['guests'],
    answer: {
      he: 'פתחו את האירוע ואז ״מוזמנים וכלים״ כדי להוסיף ולערוך מוזמנים, להדביק אנשי קשר או להעלות קובץ. ב־Premium וב־Pro יש גם ייבוא מלא מ־Excel, CSV ו־TSV. מחיקת כל המוזמנים דורשת אישור במסך הניהול; העוזר אינו מבצע שינויים בעצמו.',
      en: 'Open the event and choose Guests and tools to add or edit guests, paste contacts or upload a file. Premium and Pro also support full Excel, CSV and TSV imports. Deleting all guests requires confirmation in the management screen; this assistant cannot change records.',
    },
    link: { path: '/dashboard', he: 'ניהול אירועים', en: 'Manage events' },
  },
  {
    id: 'venue',
    terms: [
      'כתובת',
      'מיקום',
      'איפה',
      'ניווט',
      'להגיע',
      'וייז',
      'ווייז',
      'waze',
      'גוגל מפות',
      'google maps',
      'אולם',
      'address',
      'location',
      'where is',
      'directions',
    ],
    contexts: ['invitation', 'event'],
    answer: {
      he: 'שם המקום והכתובת מופיעים בהזמנה. אם בעלי האירוע הוסיפו קישורי ניווט, מופיעים שם גם כפתורים ל־Waze ול־Google Maps. את כל אלה מגדירים בעריכת האירוע.',
      en: 'The venue name and address appear on the invitation. If the hosts added navigation links, there are also Waze and Google Maps buttons. All of this is set when editing the event.',
    },
  },
  {
    id: 'seating',
    terms: [
      'הושב',
      'שולחנ',
      'מושב',
      'מפת שולחנות',
      'מפת הושבה',
      'seating',
      'table',
      'seat',
      'floor plan',
    ],
    contexts: ['guests'],
    answer: {
      he: 'ב־Premium יש מפת שולחנות ומושבים בסיסית. ב־Pro יש סטודיו הושבה מתקדם עם אזורים וקיבולת, סידור חכם, נעילת מושבים, זיהוי התנגשויות וייצוא. הכלים נמצאים ב״מוזמנים וכלים״ של האירוע.',
      en: 'Premium includes a basic tables and seats map. Pro adds an advanced seating studio with zones, capacity, smart arrangement, locked seats, conflict checks and exports. Find these tools under Guests and tools for your event.',
    },
    link: { path: '/pricing', he: 'השוואת מסלולים', en: 'Compare plans' },
  },
  {
    id: 'pricing',
    terms: [
      'מחיר',
      'עולה',
      'חינם',
      'חינמי',
      'חינמית',
      'משלמים',
      'כסף',
      'עלות',
      'יקר',
      'הבדל',
      'השווא',
      'תשלום',
      'מסלול',
      'פרימיום',
      'בייסיק',
      'פרו',
      'ניסיון',
      'ביט',
      'לשלם',
      'משלמים',
      'אמצעי תשלום',
      'מגבל',
      'הגבל',
      'מקסימום',
      'כמה מוזמנים אפשר',
      'כמה אורחים',
      'pro',
      'premium',
      'basic',
      'price',
      'cost',
      'free',
      'plan',
      'plans',
      'compare',
      'difference',
      'trial',
      'bit',
      'pay',
      'payment',
      'limit',
      'maximum',
      'how many guests',
    ],
    contexts: ['pricing'],
    answer: { he: '', en: '' },
    link: { path: '/pricing', he: 'מחירים ומסלולים', en: 'Pricing and plans' },
  },
  {
    id: 'privacy',
    terms: [
      'פרטיות',
      'אבטח',
      'מאובטח',
      'מי רואה',
      'נתונים',
      'חוקי',
      'מותר',
      'privacy',
      'security',
      'personal data',
      'legal',
      'who can see',
    ],
    answer: {
      he: 'טקסט השיחה ופרטי המוזמנים אינם נשלחים לספק AI חיצוני. לניסוח עזרה כללית, המודל מקבל רק מידע ציבורי מאומת על האתר והנחיית ניסוח קבועה. רק בעל אירוע מחובר יכול לקבל מידע על המוזמנים והתשובות באירוע שלו, והשרת בודק את ההרשאות. השיחה אינה נשמרת במסד הנתונים. לפרטים קראו את מדיניות הפרטיות.',
      en: 'Conversation text and guest details are never sent to an external AI provider. To phrase general help, the model receives only verified public site information and a fixed writing instruction. Only a signed-in event host can access their own guests and replies, subject to server permission checks. The conversation is not saved in the database. See the privacy policy for details.',
    },
    link: { path: '/privacy', he: 'מדיניות פרטיות', en: 'Privacy policy' },
  },
  {
    id: 'password',
    terms: ['סיסמ', 'להתחבר', 'לא מצליח להיכנס', 'password', 'log in', 'sign in'],
    answer: {
      he: 'בדף הכניסה לחצו על ״שכחתי סיסמה״ והזינו את כתובת האימייל של החשבון. יישלח אליכם קישור לבחירת סיסמה חדשה.',
      en: 'On the sign-in page choose “Forgot your password?” and enter your account email. You will receive a link to set a new password.',
    },
    link: { path: '/forgot-password', he: 'איפוס סיסמה', en: 'Reset password' },
  },
  {
    id: 'support',
    terms: [
      'תמיכה',
      'יצירת קשר',
      'ליצור קשר',
      'צור קשר',
      'לפנות',
      'מחיקת אירוע',
      'למחוק אירוע',
      'למחוק את האירוע',
      'מוחק אירוע',
      'ביטול אירוע',
      'החזר',
      'support',
      'contact us',
      'delete event',
      'delete my event',
      'refund',
    ],
    answer: {
      he: `לשאלות שהעוזר לא עונה עליהן, למחיקת אירוע או לעניין תשלום כתבו אל ${appConfig.supportEmail}. כדי לסגור את ההזמנה לאורחים בלי למחוק, בטלו את הסימון ״פרסום ההזמנה״ בעריכת האירוע.`,
      en: `For anything this assistant cannot answer, deleting an event or a payment matter, email ${appConfig.supportEmail}. To close the invitation to guests without deleting it, untick “Publish the invitation” when editing the event.`,
    },
  },
];

function normalized(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\u0591-\u05c7\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/[?!.,:;־–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pricingAnswer(locale: Locale, question: string): string {
  const plans = getPlanCatalog(locale);
  const text = normalized(question);
  const chosen =
    plans
      .filter((plan) => plan.code !== 'trial')
      .find((plan) => {
        return (
          new RegExp(`\\b${plan.code}\\b`, 'i').test(text) ||
          (plan.code === 'premium' && text.includes('פרימיום')) ||
          (plan.code === 'basic' && text.includes('בייסיק')) ||
          (plan.code === 'pro' && /(?:^|\s)ב?פרו(?:\s|$)/.test(text))
        );
      }) ??
    (/חינמ|ניסיון|free|trial/.test(text) ? plans.find((plan) => plan.code === 'trial') : undefined);
  const format = (value: number) =>
    new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-US').format(value);
  if (/הבדל|השווא|compare|difference/.test(text)) {
    return (
      plans
        .map((plan) =>
          locale === 'he'
            ? `${plan.name}: ₪${format(plan.priceAgorot / 100)}, עד ${format(plan.attendeeLimit)} ${plan.code === 'trial' ? 'אישורי הגעה לניסיון' : 'מוזמנים'}. ${plan.description}`
            : `${plan.name}: ₪${format(plan.priceAgorot / 100)}, up to ${format(plan.attendeeLimit)} ${plan.code === 'trial' ? 'test replies' : 'guests'}. ${plan.description}`,
        )
        .join('\n') +
      (locale === 'he' ? '\nהתשלום חד־פעמי לכל אירוע.' : '\nPayment is once per event.')
    );
  }
  if (chosen) {
    if (chosen.code === 'trial') {
      return locale === 'he'
        ? `הבדיקה החינמית כוללת עד ${format(chosen.attendeeLimit)} אישורי הגעה לניסיון. למסלולים בתשלום יש מחיר חד־פעמי לכל אירוע.`
        : `The free trial includes up to ${format(chosen.attendeeLimit)} test RSVP replies. Paid plans have a one-time price per event.`;
    }
    const price = `₪${format(chosen.priceAgorot / 100)}`;
    const features = chosen.features
      .slice(2, 5)
      .map((feature) =>
        locale === 'en' ? feature.charAt(0).toLowerCase() + feature.slice(1) : feature,
      )
      .join(', ');
    return locale === 'he'
      ? `מסלול ${chosen.name} עולה ${price} בתשלום חד־פעמי לאירוע, עד ${format(chosen.attendeeLimit)} מוזמנים. כולל ${features}.`
      : `${chosen.name} costs ${price} once per event, for up to ${format(chosen.attendeeLimit)} guests. Includes ${features}.`;
  }
  const paid = plans.filter((plan) => plan.priceAgorot > 0);
  const trial = plans.find((plan) => plan.code === 'trial');
  const trialLimit = format(trial?.attendeeLimit ?? 10);
  const payment = /ביט|לשלם|משלמים|אמצעי תשלום|\bbit\b|\bpay(?:ment)?\b/.test(text)
    ? locale === 'he'
      ? ' משלמים בטלפון, ב־Bit או בהעברה.'
      : ' You can pay by phone, Bit or bank transfer.'
    : '';
  return locale === 'he'
    ? `יש בדיקה חינמית עם עד ${trialLimit} אישורי הגעה לניסיון. מחיר חד־פעמי לאירוע: ${paid.map((plan) => `${plan.name} ₪${format(plan.priceAgorot / 100)} (עד ${format(plan.attendeeLimit)} מוזמנים)`).join(' · ')}.${payment} את המסלול מפעילים מול מפעיל האתר לאחר התשלום.`
    : `There is a free trial for up to ${trialLimit} test replies. One-time prices per event: ${paid.map((plan) => `${plan.name} ₪${format(plan.priceAgorot / 100)} (up to ${format(plan.attendeeLimit)} guests)`).join(' · ')}.${payment} Contact the operator to activate a paid plan after payment.`;
}

export function answerProductQuestion({
  locale,
  context,
  questions,
}: {
  locale: Locale;
  context: AssistantContext;
  questions: readonly string[];
}): { answer: string; links: AssistantLink[]; generation?: PublicGuideGeneration } {
  const latest = normalized(questions.at(-1) ?? '');
  const recentQuestions = questions.slice(0, -1).map(normalized).reverse();
  const previous =
    recentQuestions.find((question) =>
      articles.some((article) => article.terms.some((term) => question.includes(normalized(term)))),
    ) ?? '';
  if (/^(היי|הי|שלום|אהלן|תודה|תודה רבה|hi|hello|thanks|thank you)$/.test(latest)) {
    return {
      answer:
        locale === 'he'
          ? 'בשמחה. במה לעזור — יצירת אירוע, הזמנות, אישורי הגעה או מחירים?'
          : 'Happy to help. What do you need: event setup, invitations, RSVPs or pricing?',
      links: [],
    };
  }
  const followUp =
    /^(ו?מה עוד|ו?איך זה|ומה לגבי|וכמה|כמה זה|ו?זה|איך עושים את זה|תסביר|תפרטי?|אפשר (?:לפרט|להסביר)|תוכלי? (?:לפרט|להסביר)|בקצרה|שלב|what else|how about|how much is it|and how|is it|explain|tell me more|can you (?:explain|elaborate)|more detail|shorter|step)/.test(
      latest,
    );
  // A follow-up carries only the selected public topic/plan into the answer.
  // The combined text is used locally and is never passed to a model.
  const effectiveQuestion = followUp ? `${previous} ${latest}` : latest;
  const matchesTerm = (text: string, term: string) => {
    const normalizedTerm = normalized(term);
    return /^[a-z ]+$/.test(normalizedTerm)
      ? new RegExp(`\\b${normalizedTerm}\\b`).test(text)
      : text.includes(normalizedTerm);
  };
  const scored = articles
    .map((article) => {
      const matches = article.terms.filter((term) => matchesTerm(latest, term));
      const priorMatches = followUp
        ? article.terms.filter((term) => matchesTerm(previous, term)).length
        : 0;
      return {
        article,
        score:
          matches.length > 0
            ? matches.length * 4 +
              Math.max(...matches.map((term) => term.length)) / 10 +
              (article.contexts?.includes(context) ? 1 : 0)
            : priorMatches,
      };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ article }) => article);
  // Updating a reply is a more specific task than the general RSVP article.
  if (scored.some(({ id }) => id === 'rsvp_update')) {
    const general = scored.findIndex(({ id }) => id === 'rsvp');
    if (general >= 0) scored.splice(general, 1);
  }

  if (scored.length === 0) {
    // A guest on an invitation has no dashboard; point them at the invitation and the host.
    if (context === 'invitation') {
      return {
        answer:
          locale === 'he'
            ? 'מועד האירוע, המקום וההערות של בעלי האירוע — למשל חניה או קוד לבוש — מופיעים בהזמנה עצמה, ולעיתים גם טלפון לבירורים בתחתיתה. לשאלות אחרות על האירוע פנו לבעלי האירוע. אני יכול לעזור באישור הגעה ובשינוי תשובה.'
            : 'The date, venue and any notes from the hosts — such as parking or dress code — are on the invitation itself, sometimes with a phone number for questions at the bottom. For anything else about the event, ask the hosts. I can help with replying and changing your answer.',
        links: [],
      };
    }
    return {
      answer:
        locale === 'he'
          ? `אפשר לשאול אותי על יצירת אירוע, הזמנות, אישורי הגעה, מוזמנים, הושבה ומחירים. לשאלה על המוזמנים שלכם פתחו את האירוע בדשבורד. לשאלות אחרות כתבו אל ${appConfig.supportEmail}.`
          : `I can help with creating events, invitations, RSVPs, guests, seating and prices. For your own guest list, open the event in your dashboard. For anything else, email ${appConfig.supportEmail}.`,
      links: [{ href: '/dashboard', label: locale === 'he' ? 'האירועים שלי' : 'My events' }],
    };
  }

  const answer = scored
    .map(({ id, answer: copy }) =>
      id === 'pricing'
        ? pricingAnswer(
            locale,
            /\b(?:basic|premium|pro)\b|בייסיק|פרימיום|(?:^|\s)ב?פרו(?:\s|$)/.test(latest)
              ? latest
              : effectiveQuestion,
          )
        : copy[locale],
    )
    .join('\n\n');
  const links = scored
    .flatMap(({ link, id }) =>
      link && !(context === 'invitation' && id === 'rsvp')
        ? [
            {
              href: link.path.startsWith('/dashboard') ? link.path : localePath(locale, link.path),
              label: link[locale],
            },
          ]
        : [],
    )
    .filter((link, index, all) => all.findIndex(({ href }) => href === link.href) === index);
  return {
    answer,
    links,
    // Keep prices and privacy exact. Only curated public help may be rephrased.
    ...(scored.some(({ id }) => ['pricing', 'privacy', 'support', 'password'].includes(id))
      ? {}
      : {
          generation: {
            locale,
            facts: answer,
            format: /שלב|צעד|איך|how|step/.test(latest) ? ('steps' as const) : ('concise' as const),
          },
        }),
  };
}
