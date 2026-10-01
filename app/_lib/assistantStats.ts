/**
 * Turns the daily assistant counters into what the owner needs to decide whether the
 * assistant understands its visitors well enough: how many questions it got, how many
 * it could not match to any topic, and where.
 *
 * Input rows are aggregate counters only (see the assistant_question_stats migration);
 * nothing here can identify a visitor or a question.
 */

export interface AssistantStatRow {
  readonly day: string;
  readonly context: string;
  readonly outcome: string;
  readonly topic: string;
  readonly question_count: number;
}

export interface AssistantStatsSummary {
  readonly total: number;
  readonly unmatched: number;
  /** 0–100, rounded; null when there were no questions. */
  readonly unmatchedRate: number | null;
  readonly byOutcome: Readonly<Record<'event' | 'ai' | 'guide' | 'unmatched' | 'greeting', number>>;
  readonly byContext: readonly {
    readonly context: string;
    readonly total: number;
    readonly unmatched: number;
  }[];
  readonly topTopics: readonly { readonly topic: string; readonly count: number }[];
  readonly days: readonly {
    readonly day: string;
    readonly total: number;
    readonly unmatched: number;
  }[];
}

const OUTCOMES = ['event', 'ai', 'guide', 'unmatched', 'greeting'] as const;
const CONTEXT_ORDER = ['site', 'pricing', 'event', 'guests', 'invitation'];

function rate(part: number, whole: number): number | null {
  return whole === 0 ? null : Math.round((part / whole) * 100);
}

export function summarizeAssistantStats(rows: readonly AssistantStatRow[]): AssistantStatsSummary {
  const byOutcome = { event: 0, ai: 0, guide: 0, unmatched: 0, greeting: 0 };
  const contexts = new Map<string, { total: number; unmatched: number }>();
  const topics = new Map<string, number>();
  const days = new Map<string, { total: number; unmatched: number }>();
  let total = 0;

  for (const row of rows) {
    const count = Math.max(0, row.question_count);
    if (count === 0) continue;
    total += count;
    const unmatched = row.outcome === 'unmatched' ? count : 0;
    if ((OUTCOMES as readonly string[]).includes(row.outcome)) {
      byOutcome[row.outcome as (typeof OUTCOMES)[number]] += count;
    }

    const context = contexts.get(row.context) ?? { total: 0, unmatched: 0 };
    context.total += count;
    context.unmatched += unmatched;
    contexts.set(row.context, context);

    const day = days.get(row.day) ?? { total: 0, unmatched: 0 };
    day.total += count;
    day.unmatched += unmatched;
    days.set(row.day, day);

    if (row.topic !== 'none' && row.topic !== 'greeting') {
      topics.set(row.topic, (topics.get(row.topic) ?? 0) + count);
    }
  }

  return {
    total,
    unmatched: byOutcome.unmatched,
    unmatchedRate: rate(byOutcome.unmatched, total),
    byOutcome,
    byContext: [...contexts.entries()]
      .map(([context, value]) => ({ context, ...value }))
      .sort((a, b) => {
        const order = CONTEXT_ORDER.indexOf(a.context) - CONTEXT_ORDER.indexOf(b.context);
        return order !== 0 ? order : b.total - a.total;
      }),
    topTopics: [...topics.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic)),
    days: [...days.entries()]
      .map(([day, value]) => ({ day, ...value }))
      .sort((a, b) => b.day.localeCompare(a.day)),
  };
}

/** The first Israeli day of a window that ends today, as YYYY-MM-DD. */
export function statsWindowStart(windowDays: number, now: Date = new Date()): string {
  return israelDay(new Date(now.getTime() - (windowDays - 1) * 24 * 60 * 60 * 1000));
}

/** Today's date in Israel as YYYY-MM-DD, matching how the counters are bucketed. */
export function israelDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export const ASSISTANT_CONTEXT_LABELS: Readonly<Record<string, string>> = {
  site: 'דפי האתר',
  pricing: 'דף המחירים',
  event: 'עמוד אירוע (מארחים)',
  guests: 'מוזמנים וכלים (מארחים)',
  invitation: 'דף ההזמנה (אורחים)',
};

export const ASSISTANT_TOPIC_LABELS: Readonly<Record<string, string>> = {
  setup: 'יצירת אירוע',
  edit: 'עריכת אירוע',
  branding: 'עיצוב ומיתוג',
  sharing: 'שליחה ושיתוף',
  rsvp_update: 'שינוי תשובה',
  rsvp: 'אישור הגעה',
  guests: 'מוזמנים',
  venue: 'מקום וניווט',
  seating: 'הושבה',
  pricing: 'מחירים ומסלולים',
  privacy: 'פרטיות',
  password: 'סיסמה',
  support: 'תמיכה ומחיקה',
  event_data: 'נתוני האירוע',
};
