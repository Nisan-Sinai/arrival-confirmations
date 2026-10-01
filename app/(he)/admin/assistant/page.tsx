import type { Metadata } from 'next';

import {
  ASSISTANT_CONTEXT_LABELS,
  ASSISTANT_TOPIC_LABELS,
  statsWindowStart,
  summarizeAssistantStats,
  type AssistantStatRow,
} from '@/app/_lib/assistantStats';
import { Card } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/icons';
import { Container } from '@/components/ui/layout';
import { BackLink, PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat';
import { createPrivilegedClient } from '@/lib/server/supabase';

export const metadata: Metadata = {
  title: 'העוזר באתר',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 30;
/** Above this share of not-understood questions, a model that reads questions is worth considering. */
const ATTENTION_RATE = 20;

const numberFormat = new Intl.NumberFormat('he-IL');

function formatDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year!, month! - 1, date!)));
}

function percent(part: number, whole: number): string {
  return whole === 0 ? '—' : `${Math.round((part / whole) * 100)}%`;
}

export default async function AdminAssistantPage() {
  const since = statsWindowStart(WINDOW_DAYS);
  const { data, error } = await createPrivilegedClient()
    .from('assistant_question_stats')
    .select('day, context, outcome, topic, question_count')
    .gte('day', since)
    .limit(10_000);

  const summary = summarizeAssistantStats((data ?? []) as AssistantStatRow[]);
  const maxTopic = summary.topTopics[0]?.count ?? 0;
  const needsAttention = summary.unmatchedRate !== null && summary.unmatchedRate >= ATTENTION_RATE;

  return (
    <main id="main" className="flex-1 py-8 sm:py-12">
      <Container width="card">
        <BackLink href="/admin/events">חזרה לניהול המערכת</BackLink>

        <PageHeader
          className="mt-4"
          eyebrow="ניהול מערכת"
          title="העוזר באתר"
          lede={`כמה שאלות העוזר קיבל ב-${WINDOW_DAYS} הימים האחרונים, וכמה מהן לא הבין. נספרים רק סוג התשובה, העמוד והנושא — טקסט השאלות, כתובות IP ופרטי משתמשים לא נשמרים.`}
        />

        {error !== null ? (
          <Alert tone="error" className="mt-6">
            לא הצלחנו לטעון את נתוני העוזר.
          </Alert>
        ) : summary.total === 0 ? (
          <EmptyState
            className="mt-8"
            icon={<Icon name="sparkles" strokeWidth={1.5} className="size-6" />}
            title="עוד אין נתונים"
            description="הספירה מתחילה מהשאלה הראשונה שתישאל בעוזר."
          />
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <StatCard
                label="שאלות"
                value={numberFormat.format(summary.total)}
                icon={<Icon name="sparkles" />}
              />
              <StatCard
                label="לא הובנו"
                value={summary.unmatchedRate === null ? '—' : `${summary.unmatchedRate}%`}
                hint={`${numberFormat.format(summary.unmatched)} שאלות`}
                tone={needsAttention ? 'warning' : 'default'}
                icon={<Icon name="help-circle" />}
              />
              <StatCard
                label="נוסחו ב-AI"
                value={numberFormat.format(summary.byOutcome.ai)}
                icon={<Icon name="edit" />}
              />
              <StatCard
                label="נתוני אירוע"
                value={numberFormat.format(summary.byOutcome.event)}
                icon={<Icon name="users" />}
              />
            </div>

            <Alert tone={needsAttention ? 'warning' : 'info'} className="mt-4">
              {needsAttention
                ? `העוזר לא הבין ${summary.unmatchedRate}% מהשאלות. אם זה נמשך, שווה לשקול זיהוי נושא בעזרת AI.`
                : 'העוזר מבין את רוב השאלות. זיהוי נושא בעזרת AI שווה בדיקה רק אם שיעור השאלות שלא הובנו עולה על 20% לאורך זמן.'}
            </Alert>

            <Card padding="md" className="mt-6">
              <h2 className="text-primary font-bold">איפה העוזר לא הבין</h2>
              <ul className="mt-3 divide-y divide-[--color-border]">
                {summary.byContext.map((row) => (
                  <li key={row.context} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 text-sm">
                      {ASSISTANT_CONTEXT_LABELS[row.context] ?? row.context}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                      {numberFormat.format(row.unmatched)} מתוך {numberFormat.format(row.total)} ·{' '}
                      <span className="text-primary font-semibold">
                        {percent(row.unmatched, row.total)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            {summary.topTopics.length > 0 && (
              <Card padding="md" className="mt-4">
                <h2 className="text-primary font-bold">על מה שואלים</h2>
                <ul className="mt-3 space-y-2.5">
                  {summary.topTopics.map((row) => (
                    <li key={row.topic}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0">
                          {ASSISTANT_TOPIC_LABELS[row.topic] ?? row.topic}
                        </span>
                        <span className="text-muted-foreground shrink-0 tabular-nums">
                          {numberFormat.format(row.count)}
                        </span>
                      </div>
                      <div
                        aria-hidden="true"
                        className="bg-muted mt-1 h-1.5 overflow-hidden rounded-full"
                      >
                        <div
                          className="bg-accent-strong h-full rounded-full"
                          style={{ width: `${maxTopic === 0 ? 0 : (row.count / maxTopic) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card padding="md" className="mt-4">
              <h2 className="text-primary font-bold">לפי יום</h2>
              <ul className="mt-3 divide-y divide-[--color-border]">
                {summary.days.slice(0, 14).map((row) => (
                  <li
                    key={row.day}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span className="tabular-nums">{formatDay(row.day)}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {numberFormat.format(row.total)} שאלות · {numberFormat.format(row.unmatched)}{' '}
                      לא הובנו
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </Container>
    </main>
  );
}
