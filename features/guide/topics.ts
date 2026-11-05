import type { Locale } from '@/lib/i18n';

type TopicCopy = {
  title: string;
  description: string;
  intro: string;
  sections: readonly { title: string; body: string }[];
};

export const topics = {
  '/wedding-rsvp': {
    he: {
      title: 'אישורי הגעה לחתונה',
      description:
        'איך לאסוף אישורי הגעה לחתונה, לספור משתתפים בכל הזמנה ולהכין רשימה מסודרת לאולם.',
      intro:
        'כדי לקבל ספירת אורחים שימושית לחתונה, בקשו מכל משק בית לאשר גם את מספר המשתתפים. במערכת אישורי הגעה אפשר לשתף הזמנה דיגיטלית, לאסוף תשובות ולעבור על הרשימה לפני שמעבירים ספירה לאולם.',
      sections: [
        {
          title: 'איך מתכננים את רשימת המוזמנים?',
          body: 'סמנו מי מקבל הזמנה אישית ומי עונה בשם זוג או משפחה. אם שני הצדדים מזינים רשימות בנפרד, השוו ביניהן לפני השליחה כדי שמשק בית משותף לא ייספר פעמיים.',
        },
        {
          title: 'מתי כדאי לבקש תשובה?',
          body: 'שאלו את האולם מתי עליו לקבל ספירה סופית וקבעו מועד תשובה מוקדם יותר. כך יישאר זמן לברר עם מי שטרם ענה ולפתור פערים בין מספר המוזמנים לבין מספר המשתתפים שאושר.',
        },
        {
          title: 'מה מעבירים לאולם או לקייטרינג?',
          body: 'עברו על מספר המבוגרים והילדים שאישרו ועל ההערות הרלוונטיות, למשל בקשות תזונה. שמרו רשימה נפרדת למי שעדיין לא ענה ושתפו עם הספקים רק מידע שנחוץ להם.',
        },
      ],
    },
    en: {
      title: 'Wedding RSVPs and guest confirmations',
      description:
        'Collect wedding RSVPs, count guests on each invitation and prepare a clear headcount for the venue.',
      intro:
        'For a reliable wedding headcount, ask each household how many people are attending. With Arrival Confirmations, you can share a digital invitation, collect replies and review the list before giving your venue a count.',
      sections: [
        {
          title: 'How do you organise the guest list?',
          body: 'Mark who needs their own invitation and who will answer for a couple or family. If both sides build separate lists, compare them before sending so shared households are counted once.',
        },
        {
          title: 'When should guests reply?',
          body: 'Ask when the venue needs its final count and set an earlier RSVP deadline. Leave time to follow up with anyone who has not answered and resolve differences between invited and confirmed guests.',
        },
        {
          title: 'What do you share with the venue or caterer?',
          body: 'Review confirmed adult and child counts and relevant notes such as dietary requests. Keep pending replies separate and share only the information suppliers need.',
        },
      ],
    },
  },
  '/whatsapp-rsvp': {
    he: {
      title: 'אישורי הגעה בוואטסאפ',
      description:
        'איך לשלוח בקשת אישור הגעה בוואטסאפ, מתי להשתמש בקישור אישי ואיך לפנות למי שעדיין לא השיב.',
      intro:
        'שולחים למוזמנים הודעת WhatsApp עם קישור לאישור הגעה. האורח פותח אותו בדפדפן ושולח תשובה בלי להירשם. מארגני האירוע יכולים לעקוב אחר התשובות במערכת.',
      sections: [
        {
          title: 'מה לכתוב בהודעת אישור הגעה?',
          body: 'כתבו מי מזמין, מה האירוע, מה התאריך ועד מתי כדאי לענות. לדוגמה: ״נשמח לראות אתכם בחתונה שלנו ב־[תאריך]. אנא אשרו עד [מועד] וציינו כמה מגיעים: [קישור]. תודה!״ פתחו את הקישור בטלפון לפני שאתם שולחים אותו.',
        },
        {
          title: 'מתי להשתמש בקישור אישי?',
          body: 'במסלולי Premium ו־Pro מרכז השליחה מכין הודעה וקישור אישי לכל מוזמן. כשמשתמשים בקישור אישי, שלחו אותו רק לנמען שלו. בשליחה ידנית פותחים את WhatsApp ושולחים את ההודעות בעצמכם. שליחה מהמספר המרכזי תלויה בהפעלת WhatsApp Business במערכת.',
        },
        {
          title: 'איך שולחים תזכורת ממוקדת?',
          body: 'בדקו קודם מי עדיין לא השיב. פנו לאותם אנשים בלבד, חזרו על מועד התשובה ושלחו שוב את הקישור המתאים. אם קיבלתם תשובה בשיחה או בהודעה נפרדת, עדכנו את הרשימה לפני סבב התזכורות.',
        },
      ],
    },
    en: {
      title: 'WhatsApp RSVPs for events',
      description:
        'Send an RSVP request on WhatsApp, choose when to use personal links and follow up with guests who have not replied.',
      intro:
        'Send guests a WhatsApp message with an RSVP link. Guests open it in their browser and reply without creating an account. Hosts can track the replies in Arrival Confirmations.',
      sections: [
        {
          title: 'What should a WhatsApp RSVP message include?',
          body: 'Name the hosts, event, date and reply deadline. For example: “We would love to see you at our wedding on [date]. Please RSVP by [deadline] and tell us how many are coming: [link]. Thank you!” Test the link on your phone before sending it.',
        },
        {
          title: 'When should you use a personal RSVP link?',
          body: 'The Premium and Pro send centre prepares a message and personal link for each guest. Send each personal link only to its intended recipient. In manual mode you open WhatsApp and send the messages yourself. Sending from the central number depends on WhatsApp Business being enabled on the platform.',
        },
        {
          title: 'How do you send a targeted reminder?',
          body: 'Check who has not replied yet. Contact those guests, repeat the deadline and share the correct link again. If anyone replied by phone or in a separate message, update your list before sending reminders.',
        },
      ],
    },
  },
  '/bar-bat-mitzvah-rsvp': {
    he: {
      title: 'אישורי הגעה לבר מצווה ובת מצווה',
      description:
        'איך להכין הזמנה לבר או לבת מצווה, להפריד בין ספירת ילדים ומבוגרים ולרכז תשובות במקום אחד.',
      intro:
        'באירוע עם חברים מהכיתה, קרובי משפחה ואורחים מבוגרים, כדאי לדעת מראש מי מגיע ועם מי. במערכת אישורי הגעה אפשר לרכז תשובות ולבדוק את ספירת המבוגרים והילדים.',
      sections: [
        {
          title: 'מה כותבים אם יש טקס וקבלת פנים במקומות שונים?',
          body: 'ציינו בהזמנה את השעה והכתובת של כל חלק, והבהירו לאיזה חלק מיועדת בקשת האישור. בדקו בטלפון שקישור הניווט מתאים למקום שאליו רוב האורחים אמורים להגיע.',
        },
        {
          title: 'איך נמנעים מספירה כפולה של ילדים והורים?',
          body: 'החליטו אם הורה עונה בשם כל המשפחה או שההזמנה מתייחסת לילד אחד. בקשו לציין כמה ילדים וכמה מבוגרים מגיעים. לפני מסירת הספירה לספקים, בדקו משפחות שקיבלו הזמנה ביותר מערוץ אחד.',
        },
        {
          title: 'מה כדאי לבדוק לפני שמעבירים רשימה?',
          body: 'הפרידו בין תשובות חיוביות לבין מי שעוד לא ענה. אשרו מול הספקים איך הם מחלקים מנות ילדים ומבוגרים. תעדו רק מידע שדרוש לאירוע ושמרו הערות ופרטי קשר מחוץ לקבוצות ציבוריות.',
        },
      ],
    },
    en: {
      title: 'Bar and bat mitzvah RSVPs',
      description:
        'Prepare a bar or bat mitzvah invitation, track adult and child counts and collect replies in one place.',
      intro:
        'When classmates, relatives and other guests are invited, decide who is attending and who will answer for them. Arrival Confirmations brings replies together so you can review adult and child counts.',
      sections: [
        {
          title: 'What if the ceremony and reception are at different venues?',
          body: 'Put the time and address of each part in the invitation and make clear which part guests are responding to. Test the navigation link on a phone and make sure it points to the venue guests are expected to visit.',
        },
        {
          title: 'How do you avoid counting parents and children twice?',
          body: 'Decide whether a parent should reply for the household or an invitation covers one child. Ask for separate adult and child counts. Before sharing totals with suppliers, check households invited through more than one channel.',
        },
        {
          title: 'What should you check before sharing the list?',
          body: 'Separate confirmed guests from pending replies. Check how your caterer counts adult and child meals. Record only the details you need for the event and keep contact information and notes out of public groups.',
        },
      ],
    },
  },
} satisfies Record<string, Record<Locale, TopicCopy>>;

export type TopicPath = keyof typeof topics;
export const topicPaths = Object.keys(topics) as TopicPath[];
