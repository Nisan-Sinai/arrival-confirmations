import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ReplyTrendCard } from '@/features/admin/ReplyTrendCard';
import { computeReplyTrend, type ReplyTrend } from '@/services/rsvpStats';

/**
 * The pace chart on the event page.
 *
 * A chart is easy to make that only a mouse can read. These hold the three other ways
 * in: the figures stated in text beside it, the keyboard, and the table.
 */

const NOW = new Date('2026-08-15T12:00:00+03:00');

function trendOf(submitted: readonly string[], days = 5): ReplyTrend {
  return computeReplyTrend(
    submitted.map((submitted_at) => ({ submitted_at })),
    NOW,
    days,
  );
}

const busy = trendOf([
  '2026-08-12T09:00:00+03:00',
  '2026-08-12T10:00:00+03:00',
  '2026-08-12T11:00:00+03:00',
  '2026-08-14T09:00:00+03:00',
  '2026-08-15T09:00:00+03:00',
]);

/** The chart, by name — `<details>` is a group too, so the role alone is ambiguous. */
const CHART_NAME = /תשובות לפי יום/;
const chart = () => screen.getByRole('group', { name: CHART_NAME });

describe('ReplyTrendCard', () => {
  it('states the total, today and the busiest day in text', () => {
    render(<ReplyTrendCard trend={busy} />);

    const card = screen.getByRole('region', { name: 'קצב התשובות' });
    expect(within(card).getByText('5')).toBeInTheDocument();
    expect(within(card).getByText('תשובות ב-5 הימים האחרונים')).toBeInTheDocument();
    // Today had one reply; Hebrew does not say "1 replies".
    expect(within(card).getAllByText('תשובה אחת').length).toBeGreaterThan(0);
    expect(within(card).getByText('3 תשובות')).toBeInTheDocument();
    expect(within(card).getByText('(12.8)')).toBeInTheDocument();
  });

  it('gives every day a named column, oldest first', () => {
    render(<ReplyTrendCard trend={busy} />);

    const columns = within(chart()).getAllByRole('button');
    expect(columns.map((column) => column.getAttribute('aria-label'))).toEqual([
      'יום שלישי, 11.8: אין תשובות',
      'יום רביעי, 12.8: 3 תשובות',
      'יום חמישי, 13.8: אין תשובות',
      'יום שישי, 14.8: תשובה אחת',
      'יום שבת, 15.8: תשובה אחת',
    ]);
  });

  it('draws equal values at equal heights, labelled or not', () => {
    // Two days of two replies each. Only the earlier is labelled as the peak, and it
    // used to be drawn shorter because the label took its room out of the bar.
    const tied = trendOf([
      '2026-08-12T09:00:00+03:00',
      '2026-08-12T10:00:00+03:00',
      '2026-08-14T09:00:00+03:00',
      '2026-08-14T10:00:00+03:00',
    ]);
    render(<ReplyTrendCard trend={tied} />);

    const columns = within(chart()).getAllByRole('button');
    const bar = (index: number) => (columns[index]!.firstElementChild as HTMLElement).style.height;
    expect(bar(1)).toBe(bar(3));
    expect(bar(1)).toContain('100');
    // A day with nothing has no bar at all, rather than a sliver that reads as one reply.
    expect(bar(0)).toBe('0px');
  });

  it('labels only the busiest day and today on the chart itself', () => {
    render(<ReplyTrendCard trend={busy} />);

    const columns = within(chart()).getAllByRole('button');
    expect(columns.map((column) => column.textContent)).toEqual(['', '3', '', '', '1']);
  });

  it('keeps one tab stop and moves between days with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<ReplyTrendCard trend={busy} />);

    const columns = within(chart()).getAllByRole('button');
    expect(columns.filter((column) => column.tabIndex === 0)).toHaveLength(1);
    expect(columns.at(-1)).toHaveAttribute('tabindex', '0');

    await user.tab();
    expect(columns.at(-1)).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(columns[3]).toHaveFocus();
    expect(columns[3]).toHaveAttribute('tabindex', '0');
    expect(columns.at(-1)).toHaveAttribute('tabindex', '-1');

    // The axis has ends; the keys stop at them instead of wrapping or throwing.
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(columns.at(-1)).toHaveFocus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}');
    expect(columns[0]).toHaveFocus();

    // Any other key is left alone.
    await user.keyboard('{ArrowUp}');
    expect(columns[0]).toHaveFocus();
  });

  it('follows the pointer and returns to today when it leaves', async () => {
    const user = userEvent.setup();
    const { container } = render(<ReplyTrendCard trend={busy} />);
    const readout = () => container.querySelector('p[aria-hidden="true"]')!.textContent;

    expect(readout()).toContain('יום שבת, 15.8');
    const columns = within(chart()).getAllByRole('button');
    await user.hover(columns[1]!);
    expect(readout()).toContain('3 תשובות');
    expect(readout()).toContain('יום רביעי, 12.8');

    await user.unhover(chart());
    expect(readout()).toContain('יום שבת, 15.8');
  });

  it('lists every day in a table that needs no pointer', () => {
    render(<ReplyTrendCard trend={busy} />);

    const table = screen.getByRole('table', { name: 'תשובות שהתקבלו בכל יום', hidden: true });
    const rows = within(table).getAllByRole('row', { hidden: true });
    // A header row and one per day.
    expect(rows).toHaveLength(6);
    expect(rows[2]).toHaveTextContent('יום רביעי, 12.8');
    expect(rows[2]).toHaveTextContent('3');
  });

  it('says so in words, and draws no chart, when the window is empty', () => {
    render(<ReplyTrendCard trend={trendOf([])} />);

    expect(screen.getByText(/לא התקבלו תשובות ב-5 הימים האחרונים/)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: CHART_NAME })).toBeNull();
    expect(screen.queryByRole('table', { hidden: true })).toBeNull();
    expect(screen.getByText('אין תשובות')).toBeInTheDocument();
    // No busiest day to name.
    expect(screen.queryByText('היום העמוס ביותר')).toBeNull();
  });

  it('renders nothing for a window of no days', () => {
    const { container } = render(<ReplyTrendCard trend={trendOf([], 0)} />);
    expect(container).toBeEmptyDOMElement();
  });
});
