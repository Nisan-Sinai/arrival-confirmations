import { describe, expect, it } from 'vitest';

import { israelDay, statsWindowStart, summarizeAssistantStats } from '@/app/_lib/assistantStats';

const row = (
  day: string,
  context: string,
  outcome: string,
  topic: string,
  question_count: number,
) => ({
  day,
  context,
  outcome,
  topic,
  question_count,
});

describe('assistant stats summary', () => {
  it('reports totals, the not-understood rate and where misses happen', () => {
    const summary = summarizeAssistantStats([
      row('2026-10-01', 'site', 'ai', 'setup', 6),
      row('2026-10-01', 'site', 'unmatched', 'none', 2),
      row('2026-10-02', 'invitation', 'unmatched', 'none', 2),
      row('2026-10-02', 'invitation', 'guide', 'rsvp', 3),
      row('2026-10-02', 'event', 'event', 'event_data', 4),
      row('2026-10-02', 'site', 'greeting', 'greeting', 3),
    ]);

    expect(summary.total).toBe(20);
    expect(summary.unmatched).toBe(4);
    expect(summary.unmatchedRate).toBe(20);
    expect(summary.byOutcome).toEqual({ event: 4, ai: 6, guide: 3, unmatched: 4, greeting: 3 });
    expect(summary.byContext).toEqual([
      { context: 'site', total: 11, unmatched: 2 },
      { context: 'event', total: 4, unmatched: 0 },
      { context: 'invitation', total: 5, unmatched: 2 },
    ]);
    expect(summary.topTopics).toEqual([
      { topic: 'setup', count: 6 },
      { topic: 'event_data', count: 4 },
      { topic: 'rsvp', count: 3 },
    ]);
    expect(summary.days).toEqual([
      { day: '2026-10-02', total: 12, unmatched: 2 },
      { day: '2026-10-01', total: 8, unmatched: 2 },
    ]);
  });

  it('has no rate rather than 0% when there were no questions', () => {
    expect(summarizeAssistantStats([]).unmatchedRate).toBeNull();
  });

  it('ignores empty or negative counters', () => {
    expect(summarizeAssistantStats([row('2026-10-01', 'site', 'ai', 'setup', -3)]).total).toBe(0);
  });

  it('buckets by the Israeli calendar day, like the database counter', () => {
    // 22:30 UTC on 1 Oct is already 2 Oct in Israel (UTC+3).
    expect(israelDay(new Date('2026-10-01T22:30:00Z'))).toBe('2026-10-02');
  });

  it('starts a 30-day window 29 Israeli days before today', () => {
    expect(statsWindowStart(30, new Date('2026-10-01T22:30:00Z'))).toBe('2026-09-03');
  });
});
