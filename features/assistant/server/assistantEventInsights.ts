import 'server-only';

import { createUserClient } from '@/lib/server/supabase';
import type { Locale } from '@/lib/i18n';

type Intent =
  | 'summary'
  | 'attending'
  | 'not_attending'
  | 'maybe'
  | 'unanswered'
  | 'guests'
  | 'people'
  | 'adults'
  | 'children'
  | 'babies';
type Guest = { id: string; full_name: string };
type Reply = {
  guest_id: string | null;
  full_name: string;
  attendance_status: 'attending' | 'not_attending' | 'maybe';
  adults_count: number;
  children_count: number;
  babies_count: number;
};

function detectIntent(question: string): Intent | null {
  const text = question
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\u0591-\u05c7\u200b-\u200f]/g, '');
  // An invitation guest asking how to decline needs instructions, not a host lookup.
  if (/איך|כיצד|לשנות|לעדכן|how (?:do|can|to)|change|update/.test(text)) return null;
  // "How many guests can I add?" / "Can I bring kids?" ask what the product or event
  // allows, not what the data says. Answering them with "open your event" sent visitors
  // and invitation guests to a dashboard they do not have.
  if (
    /(?:אפשר|מותר|ניתן|can (?:i|we|you)|allowed|able to).*(?:להכניס|להזמין|לרשום|להביא|להוסיף|לצרף|invite|add|bring|register)|מגבל|הגבל|מקסימום|עד כמה|\blimit|maximum/.test(
      text,
    )
  )
    return null;
  if (
    !/מי|כמה|רשימ|תראה|הצג|מצב|סיכום|סטטיסט|סטטוס|מה עם|who|how many|list|show|stats|status|count|summary/.test(
      text,
    )
  )
    return null;
  if (/כמה.*(?:תינוק|פעוט)|how many.*bab/.test(text)) return 'babies';
  if (/כמה.*ילד|how many.*child|how many.*kids/.test(text)) return 'children';
  if (/כמה.*מבוגר|how many.*adult/.test(text)) return 'adults';
  if (
    /כמה.*(?:אנשים|אורחים|יגיעו|מגיעים)|how many.*(?:people|attendees|will attend|are coming)/.test(
      text,
    )
  )
    return 'people';
  if (
    /מי לא ענה|מי טרם ענה|טרם ענו|לא השיב|לא ענו|לא הגיב|עדיין לא אישר|טרם אישר|עוד לא אישר|ממתינ.*לתשובה|unanswered|not replied|not responded|has not replied|haven.t replied|hasn.t replied|no response|not yet confirmed/.test(
      text,
    )
  )
    return 'unanswered';
  if (/לא מגיע|לא יגיע|לא בא|מי לא\??$|declined|not attending|not coming/.test(text))
    return 'not_attending';
  if (/מתלבט|אולי|maybe|undecided/.test(text)) return 'maybe';
  if (/מי מגיע|מי בא|מי אישר|כמה אישרו|אישרו הגעה|attending|who confirmed|who is coming/.test(text))
    return 'attending';
  if (/רשימת מוזמנ|מי המוזמנ|כל המוזמנ|כמה מוזמנ|guest list|all guests|how many guests/.test(text))
    return 'guests';
  if (
    /כמה תשוב|כמה אישורי הגעה|סיכום|מצב (?:ה)?אירוע|המצב באירוע|סטטוס|סטטיסטיק|rsvp count|event stats|status|how many repl|summary/.test(
      text,
    )
  )
    return 'summary';
  return null;
}

function namesReply(names: readonly string[], total: number, locale: Locale): string {
  if (total === 0) return locale === 'he' ? 'אין רשומות מתאימות.' : 'No matching records.';
  const listed = names.slice(0, 20).join(', ');
  const rest =
    total > 20 ? (locale === 'he' ? ` ועוד ${total - 20}.` : ` and ${total - 20} more.`) : '.';
  return `${listed}${rest}`;
}

export async function getHostEventAnswer({
  question,
  eventId,
  locale,
}: {
  question: string;
  eventId?: string;
  locale: Locale;
}): Promise<{ answer: string; links: { href: string; label: string }[] } | null> {
  const intent = detectIntent(question);
  if (intent === null) return null;
  if (!eventId) {
    return {
      answer:
        locale === 'he'
          ? 'כדי לענות מתוך הנתונים, פתחו את האירוע שלכם בדשבורד ושאלו שוב בעמוד האירוע. הנתונים נשארים באתר.'
          : 'Open your event in the dashboard and ask again on its page. The data stays on this site.',
      links: [{ href: '/dashboard', label: locale === 'he' ? 'האירועים שלי' : 'My events' }],
    };
  }

  // This path uses the caller's session and RLS. Guest data stays on the site.
  const supabase = await createUserClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('ASSISTANT_AUTH_REQUIRED');
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();
  if (eventError) throw new Error('ASSISTANT_EVENT_READ_FAILED');
  if (!event) throw new Error('ASSISTANT_EVENT_NOT_FOUND');

  const guests: Guest[] = [];
  const replies: Reply[] = [];
  // Supabase projects often cap a request at 1,000 rows. Page through the whole
  // event so counts never silently become inaccurate for a large Pro event.
  for (let page = 0; page < 10; page += 1) {
    const { data, error } = await supabase
      .from('guests')
      .select('id, full_name')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .is('token_revoked_at', null)
      .order('id')
      .range(page * 1000, page * 1000 + 999);
    if (error || !data) throw new Error('ASSISTANT_GUEST_READ_FAILED');
    guests.push(...data);
    if (data.length < 1000) break;
    if (page === 9) throw new Error('ASSISTANT_TOO_MANY_ROWS');
  }
  for (let page = 0; page < 10; page += 1) {
    const { data, error } = await supabase
      .from('rsvps')
      .select('guest_id, full_name, attendance_status, adults_count, children_count, babies_count')
      .eq('event_id', eventId)
      .order('id')
      .range(page * 1000, page * 1000 + 999);
    if (error || !data) throw new Error('ASSISTANT_RSVP_READ_FAILED');
    replies.push(...data);
    if (data.length < 1000) break;
    if (page === 9) throw new Error('ASSISTANT_TOO_MANY_ROWS');
  }

  const link = {
    href: `/dashboard/events/${eventId}${intent === 'unanswered' || intent === 'guests' ? '/guests' : ''}`,
    label: locale === 'he' ? 'פתיחת האירוע' : 'Open event',
  };
  const population = /לא מגיע|לא יגיע|not attending|not coming|declined/.test(
    question.toLocaleLowerCase(),
  )
    ? 'not_attending'
    : /מתלבט|אולי|maybe|undecided/.test(question.toLocaleLowerCase())
      ? 'maybe'
      : 'attending';
  const attendingReplies = replies.filter((row) => row.attendance_status === population);
  const adults = attendingReplies.reduce((sum, row) => sum + row.adults_count, 0);
  const children = attendingReplies.reduce((sum, row) => sum + row.children_count, 0);
  const babies = attendingReplies.reduce((sum, row) => sum + row.babies_count, 0);
  if (intent === 'people' || intent === 'adults' || intent === 'children' || intent === 'babies') {
    const total = { people: adults + children + babies, adults, children, babies }[intent];
    return {
      answer:
        locale === 'he'
          ? `לפי התשובות שסומנו כ${{ attending: 'מגיעים', not_attending: 'לא מגיעים', maybe: 'מתלבטים' }[population]}: ${intent === 'people' ? `סה״כ ${total} אנשים — ${adults} מבוגרים, ${children} ילדים ו־${babies} תינוקות` : `${total} ${{ adults: 'מבוגרים', children: 'ילדים', babies: 'תינוקות' }[intent]}`}. הספירה היא של אנשים, ולא של מספר הטפסים שנענו.`
          : `Based on ${population === 'not_attending' ? 'declined' : population} replies: ${intent === 'people' ? `${total} people — ${adults} adults, ${children} children and ${babies} babies` : `${total} ${intent}`}. This counts people, not response forms.`,
      links: [link],
    };
  }
  if (intent === 'summary') {
    const attending = replies.filter((row) => row.attendance_status === 'attending');
    const declined = replies.filter((row) => row.attendance_status === 'not_attending').length;
    const maybe = replies.filter((row) => row.attendance_status === 'maybe').length;
    const people = attending.reduce(
      (sum, row) => sum + row.adults_count + row.children_count + row.babies_count,
      0,
    );
    return {
      answer:
        locale === 'he'
          ? `באירוע יש ${replies.length} תשובות: ${attending.length} מגיעים, ${declined} לא מגיעים ו־${maybe} מתלבטים. צפויים להגיע ${people} אנשים.`
          : `${replies.length} replies: ${attending.length} attending, ${declined} declined and ${maybe} undecided. ${people} people are expected to attend.`,
      links: [link],
    };
  }
  if (intent === 'unanswered') {
    const repliedIds = new Set(
      replies.flatMap((reply) => (reply.guest_id ? [reply.guest_id] : [])),
    );
    const pending = guests.filter((guest) => !repliedIds.has(guest.id));
    return {
      answer:
        (locale === 'he'
          ? `ברשימת ההזמנות האישיות ${pending.length} מוזמנים טרם ענו: `
          : `${pending.length} guests on the personal invite list have not replied: `) +
        namesReply(
          pending.map(({ full_name }) => full_name),
          pending.length,
          locale,
        ) +
        (locale === 'he'
          ? ' תשובות להזמנה ציבורית אינן משויכות אוטומטית לרשימה האישית.'
          : ' Replies through the public link are not automatically matched to personal invites.'),
      links: [link],
    };
  }
  const rows =
    intent === 'guests' ? guests : replies.filter((reply) => reply.attendance_status === intent);
  const label =
    locale === 'he'
      ? { attending: 'מגיעים', not_attending: 'לא מגיעים', maybe: 'מתלבטים', guests: 'מוזמנים' }[
          intent
        ]
      : { attending: 'Attending', not_attending: 'Declined', maybe: 'Undecided', guests: 'Guests' }[
          intent
        ];
  return {
    answer: `${label}: ${rows.length}.${
      /כמה|how many|count/.test(question.toLocaleLowerCase())
        ? ''
        : ` ${namesReply(
            rows.map(({ full_name }) => full_name),
            rows.length,
            locale,
          )}`
    }`,
    links: [link],
  };
}
