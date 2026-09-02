import type { Dictionary } from './types';

/** Hebrew — the original copy, moved here unchanged from `UI_MESSAGES`. */
export const he: Dictionary = {
  rsvp: {
    submitting: 'שולח…',
    submit: 'שליחת אישור הגעה',
    successTitle: 'תודה רבה!',
    successAttending: 'אישור ההגעה שלכם נקלט. מחכים לראותכם!',
    successNotAttending: 'עדכנתם שלא תוכלו להגיע. תודה שהודעתם.',
    successMaybe: 'קיבלנו את התשובה. נשמח לעדכון סופי כשתדעו.',
    updated: 'העדכון נשמר בהצלחה.',
    genericAcknowledgement: 'התשובה שלכם התקבלה. תודה רבה!',
    networkError: 'הבקשה לא הושלמה בגלל תקלת רשת. אפשר לנסות שוב.',
    rateLimited: 'נשלחו יותר מדי בקשות. נסו שוב בעוד מספר דקות.',
    unknownError: 'אירעה תקלה בשמירת אישור ההגעה. נסו שוב, ואם התקלה חוזרת פנו אלינו.',
  },
  invite: {
    invalidToken: 'הקישור אינו תקין או שפג תוקפו. אנא בקשו קישור מעודכן מבעלי השמחה.',
    sessionExpired: 'תוקף ההתחברות פג. אנא פתחו שוב את הקישור האישי שקיבלתם.',
  },
  admin: {
    loginFailed: 'פרטי ההתחברות שגויים.',
    notAuthorized: 'אין לכם הרשאה לצפות בעמוד זה.',
    saved: 'השינויים נשמרו.',
    deleted: 'הרשומה נמחקה.',
    linkCopied: 'הקישור הועתק.',
    linkRevoked: 'הקישור בוטל.',
    linkRegenerated: 'נוצר קישור חדש. הקישור הקודם בוטל.',
    exportEmpty: 'אין נתונים לייצוא.',
    responseRateUnavailable: 'לא זמין',
    actionFailed: 'הפעולה נכשלה. נסו שוב.',
  },
  validation: {
    required: 'שדה חובה',
    fullNameTooShort: 'יש להזין שם מלא (לפחות 2 תווים)',
    fullNameTooLong: 'השם ארוך מדי',
    phoneInvalid: 'מספר טלפון ישראלי לא תקין',
    attendanceRequired: 'יש לבחור אם תגיעו',
    countNegative: 'לא ניתן להזין מספר שלילי',
    countTooLarge: 'המספר גבוה מדי',
    consentRequired: 'יש לאשר את השימוש בפרטים כדי לשלוח',
    notesTooLong: 'ההערה ארוכה מדי',
    dietaryTooLong: 'הפירוט ארוך מדי',
  },
  errors: {
    notFoundTitle: 'הדף לא נמצא',
    notFoundBody: 'ייתכן שהקישור שגוי או שהוסר.',
    genericTitle: 'משהו השתבש',
    genericBody: 'אירעה תקלה זמנית. נסו לרענן את הדף.',
    offlineTitle: 'אין חיבור לאינטרנט',
    offlineBody: 'הדף יטען מחדש כשהחיבור יחזור.',
  },
  a11y: {
    skipToContent: 'דילוג לתוכן הראשי',
    loading: 'טוען…',
    requiredField: 'שדה חובה',
    externalLink: 'נפתח בחלון חדש',
  },
  header: {
    homeAria: 'דף הבית — אישורי הגעה',
    navAria: 'ניווט ראשי',
    pricing: 'מחירים',
    login: 'כניסה',
    signup: 'יצירת אירוע',
  },
  flow: {
    eyebrow: 'מה קורה אחרי ששולחים את הקישור?',
    title: 'שלושה צעדים פשוטים עד לאישור ההגעה',
    demoPlay: 'הפעלת סרטון ההדגמה',
    demoCaption: 'לחצו לצפייה · 20 שניות',
    demoClose: 'סגירת הסרטון',
    steps: [
      {
        title: 'האורח פותח מה-WhatsApp',
        body: 'אין צורך בהרשמה או בהתקנת אפליקציה.',
      },
      {
        title: 'ממלא אישור הגעה',
        body: 'שם, טלפון, מספר מגיעים והעדפות חשובות.',
      },
      {
        title: 'התשובה מופיעה בדשבורד',
        body: 'הנתונים מתעדכנים מיד ומוכנים לסיכום ולייצוא.',
      },
    ],
  },
  pricing: {
    highlightedBadge: 'המסלול המתקדם',
    trialNote: 'ללא כרטיס אשראי',
    oneTimeNote: 'תשלום חד-פעמי לאירוע',
    trialCta: 'יצירת אירוע לבדיקה',
    choosePlan: 'בחירת {plan}',
    whatsappIntro: 'שלום ניסן, אני מעוניין להפעיל את מסלול {plan} לאירוע במערכת אישורי הגעה.',
  },
  authNotice: {
    otpExpired:
      'הקישור פג תוקף או שכבר נעשה בו שימוש. קישורי איפוס תקפים לזמן מוגבל ולפעם אחת בלבד.',
    accessDenied: 'הבקשה נדחתה. אם ביקשתם איפוס סיסמה, בקשו קישור חדש.',
    generic: 'אירעה תקלה באימות. נסו שוב.',
    requestNewLink: 'בקשת קישור חדש',
  },
  auth: {
    fields: {
      email: 'כתובת אימייל',
      password: 'סיסמה',
      newPassword: 'סיסמה חדשה',
      confirmPassword: 'אימות הסיסמה החדשה',
      passwordHint: 'לפחות {min} תווים',
    },
    forgotPassword: 'שכחתי סיסמה',
    checkInbox: 'בדקו את תיבת הדואר',
    backToLogin: 'חזרה לכניסה',
    modes: {
      signIn: {
        title: 'כניסה לחשבון',
        subtitle: 'נהלו את האירועים שלכם ואת אישורי ההגעה שהתקבלו.',
        submit: 'כניסה',
        pending: 'נכנס…',
        footerPrompt: 'אין לכם חשבון?',
        footerLink: 'הרשמה חינם',
      },
      signUp: {
        title: 'יצירת חשבון',
        subtitle: 'חינם, בלי כרטיס אשראי, עם עד 10 אישורי הגעה לבדיקה.',
        submit: 'יצירת חשבון',
        pending: 'יוצר…',
        footerPrompt: 'כבר יש לכם חשבון?',
        footerLink: 'כניסה',
      },
      requestReset: {
        title: 'שחזור סיסמה',
        subtitle: 'הזינו את כתובת האימייל של החשבון ונשלח אליה קישור לבחירת סיסמה חדשה.',
        submit: 'שליחת קישור איפוס',
        pending: 'שולח…',
        footerPrompt: 'נזכרתם?',
        footerLink: 'חזרה לכניסה',
      },
      setPassword: {
        title: 'בחירת סיסמה חדשה',
        subtitle: 'לאחר השמירה תיכנסו אוטומטית לחשבון.',
        submit: 'שמירת הסיסמה',
        pending: 'שומר…',
      },
    },
    errors: {
      loginFailed: 'פרטי ההתחברות שגויים.',
      invalidEmail: 'כתובת אימייל לא תקינה',
      passwordTooShort: 'הסיסמה חייבת להכיל לפחות {min} תווים',
      passwordsMismatch: 'שתי הסיסמאות אינן זהות',
      linkExpired: 'הקישור פג תוקף. בקשו קישור איפוס חדש.',
    },
    sent: {
      signupMaybe: 'אם הכתובת פנויה, נשלח אליה מייל אימות. בדקו את תיבת הדואר.',
      signupConfirm: 'שלחנו מייל אימות לכתובת שהזנתם. אשרו אותו כדי להיכנס.',
      resetLink: 'אם קיים חשבון עם הכתובת הזו, נשלח אליה קישור לאיפוס סיסמה.',
    },
    loginNotice: {
      expiredLead:
        'הקישור פג תוקף או שכבר נעשה בו שימוש. קישורי איפוס תקפים לזמן מוגבל ולפעם אחת בלבד —',
      expiredLink: 'בקשו קישור חדש',
      authFailed: 'לא הצלחנו להשלים את ההתחברות. נסו שוב, ואם התקלה חוזרת בקשו קישור חדש.',
    },
    resetExpired: {
      title: 'הקישור פג תוקף',
      body: 'קישורי איפוס תקפים לזמן מוגבל וניתן להשתמש בהם פעם אחת בלבד. בקשו קישור חדש ונשלח אותו שוב.',
      cta: 'בקשת קישור חדש',
    },
    callback: {
      heading: 'רגע אחד…',
      subtitle: 'מאמתים את הקישור',
      verifyingSr: 'מאמת את הקישור…',
      failedSr: 'האימות נכשל',
      noscript: 'השלמת הקישור דורשת JavaScript. הפעילו אותו בדפדפן ופתחו את הקישור שוב.',
    },
  },
  languageSwitch: {
    label: 'EN',
    ariaLabel: 'Switch to English',
  },
  site: {
    name: 'אישורי הגעה',
    description: 'הזמנה דיגיטלית ואישור הגעה לאירוע',
    publisherDescription:
      'בית תוכנה ישראלי המפתח אתרים, מערכות ניהול ואוטומציות לעסקים, ומפעיל את מערכת אישורי ההגעה לאירועים.',
  },
  footer: {
    builtBy: 'האתר עוצב ופותח ע״י',
    builderName: 'ניסן סיני טכנולוגיות',
    navAria: 'קישורי חובה',
    pricing: 'מסלולים ומחירים',
    privacy: 'מדיניות פרטיות',
    accessibility: 'הצהרת נגישות',
  },
  landing: {
    meta: {
      title: 'אישורי הגעה לאירועים | ניסן סיני טכנולוגיות',
      description:
        'אישורי הגעה לאירועים במקום אחד: הזמנה דיגיטלית, שיתוף ב-WhatsApp, ניהול מוזמנים ודשבורד בזמן אמת. מתחילים בבדיקה חינמית וללא מנוי חודשי.',
      ogTitle: 'אישורי הגעה לאירועים | ניסן סיני טכנולוגיות',
      ogDescription:
        'הזמנה דיגיטלית, שיתוף ב-WhatsApp, ניהול מוזמנים ודשבורד בזמן אמת — מתחילים בבדיקה חינמית וללא מנוי חודשי.',
    },
    hero: {
      eyebrow: 'אישורי הגעה לאירועים',
      titleLead: 'מנהלים את המוזמנים',
      titleAccent: 'בלי לרדוף אחרי תשובות',
      lead: 'יוצרים הזמנה דיגיטלית, משתפים ב-WhatsApp ורואים את כל אישורי ההגעה במקום אחד. מתחילים בבדיקה חינמית ומשלמים רק כשמפעילים את האירוע.',
      ctaPrimary: 'יצירת אירוע לבדיקה',
      ctaSecondary: 'צפייה במסלולים',
      facts: ['10 אישורים לבדיקה', 'תשלום חד-פעמי', 'בלי חיוב חודשי'],
    },
    invitationPreview: {
      blessing: 'ב״ה',
      introFirstLine: 'בשבח והודיה לה׳ יתברך',
      introSecondLine: 'שמחים להזמינכם לחתונה של',
      occasion: 'חתונה',
      dateLabel: 'תאריך',
      dateValue: 'י״ד באלול',
      timeLabel: 'שעה',
      timeValue: '19:00',
      placeLabel: 'מקום',
      placeValue: 'אולמי הדר',
      countdownDays: 'ימים',
      countdownHours: 'שעות',
      countdownMinutes: 'דקות',
      captionLead: 'כך נראית ההזמנה',
      captionAccent: 'שנשלחת בוואטסאפ',
    },
    benefits: {
      eyebrow: 'מה מקבלים',
      title: 'כל מה שצריך לאירוע מסודר',
      items: [
        {
          title: 'הזמנה דיגיטלית מעוצבת',
          body: 'תאריך עברי, ספירה לאחור, Waze ו-Google Maps בדף שנראה כמו הזמנה ולא כמו טופס.',
        },
        {
          title: 'דשבורד בזמן אמת',
          body: 'רואים מי מגיע, כמה מבוגרים וילדים, דרישות תזונה והערות — מכל טלפון.',
        },
        {
          title: 'עברית ו-RTL מהיסוד',
          body: 'הטפסים, הטבלאות והמסכים נבנו במיוחד לקהל הישראלי ולשימוש נוח ב-WhatsApp.',
        },
      ],
    },
    plans: {
      eyebrow: 'מסלולים',
      title: 'מתחילים בחינם, מפעילים כשמוכנים',
      lead: 'Basic ב-99 ₪, Premium ב-199 ₪ או Pro ב-349 ₪ — תשלום חד-פעמי לאירוע.',
    },
    faq: {
      eyebrow: 'שאלות נפוצות',
      title: 'לפני שמתחילים',
      items: [
        {
          question: 'אפשר לבדוק לפני שמשלמים?',
          answer:
            'כן. יוצרים אירוע מלא וניתן לקבל עד 10 אישורי הגעה לבדיקה. תשלום נדרש רק להפעלה רחבה יותר.',
        },
        {
          question: 'זה מנוי חודשי?',
          answer: 'לא. התשלום הוא חד-פעמי לכל אירוע, ללא התחייבות וללא חיוב מתחדש.',
        },
        {
          question: 'איך משלמים?',
          answer:
            'יוצרים קשר בטלפון או ב-WhatsApp ומשלמים ישירות. לאחר מכן מנהל המערכת מפעיל את המסלול לאירוע.',
        },
        {
          question: 'האורחים צריכים להירשם?',
          answer:
            'לא. האורחים פותחים את הקישור, ממלאים את הפרטים ומאשרים הגעה בלי חשבון ובלי התקנה.',
        },
      ],
    },
  },
};
