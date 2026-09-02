import { render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Countdown } from '@/features/invite/Countdown';

/**
 * The clock on the invitation.
 *
 * Two things are worth holding in place here. The first is the one the component was
 * written for: it renders its boxes at full size before it has a figure to put in them,
 * because returning `null` until mounted grew the card by a row of medallions the instant
 * the effect ran — under whatever the guest's thumb happened to be over.
 *
 * The second is newer. Each figure is keyed by its own value so that a change remounts
 * the element and replays the tick animation. Keying by the unit instead would hand the
 * same element a new number and animate nothing, which is easy to reintroduce and
 * invisible in review.
 */
const NOW = new Date('2026-07-01T12:00:00.000Z').getTime();
const target = NOW + 3 * 86_400_000 + 4 * 3_600_000 + 5 * 60_000 + 6 * 1000;

beforeEach(() => {
  // `requestAnimationFrame` has to be faked explicitly: the component seeds its first
  // figure from inside one, and without it the boxes never leave their placeholder state
  // and every assertion below is testing the pre-mount render.
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'Date',
    ],
  });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Runs whatever the mount effect scheduled.
 *
 * `runOnlyPendingTimers` rather than a fixed advance: the component seeds its first
 * figure from a `requestAnimationFrame`, and guessing a frame budget in milliseconds is
 * how this ends up passing on one machine and not another.
 */
async function settle() {
  await act(async () => {
    vi.runOnlyPendingTimers();
    await Promise.resolve();
  });
}

/** Moves the clock and lets the one-second interval fire. */
async function advanceSeconds(seconds: number) {
  await act(async () => {
    vi.advanceTimersByTime(seconds * 1000);
    await Promise.resolve();
  });
}

describe('Countdown', () => {
  it('draws its boxes before it has a figure, so the card cannot grow under a thumb', () => {
    const { container } = render(<Countdown targetMs={target} />);

    // Four medallions, each already at full size, with the figures blanked.
    expect(container.querySelectorAll('.tabular-nums')).toHaveLength(4);
    expect(screen.getAllByText('––')).toHaveLength(4);
  });

  it('shows the remaining time once mounted', async () => {
    const { container } = render(<Countdown targetMs={target} />);
    await settle();

    // Days, hours and minutes, which a second of settling cannot move.
    const figures = [...container.querySelectorAll('.tick')].map((el) => el.textContent);
    expect(figures.slice(0, 3)).toEqual(['3', '4', '5']);
    expect(screen.queryByText('––')).not.toBeInTheDocument();
  });

  it('gives every figure the tick class, so a change is animated', async () => {
    const { container } = render(<Countdown targetMs={target} />);
    await settle();

    expect(container.querySelectorAll('.tick')).toHaveLength(4);
  });

  it('replaces the element when the figure changes, which is what replays the animation', async () => {
    const { container } = render(<Countdown targetMs={target} />);
    await settle();

    // Asserted as a change rather than against a literal: `settle` runs the pending
    // interval as well as the frame, so the exact second on arrival is an implementation
    // detail. What matters is that a new value produces a new element.
    const secondsBefore = [...container.querySelectorAll('.tick')].at(-1);
    const valueBefore = secondsBefore?.textContent;

    await advanceSeconds(1);

    const secondsAfter = [...container.querySelectorAll('.tick')].at(-1);
    expect(secondsAfter?.textContent).not.toBe(valueBefore);
    // A new node, not the same one relabelled — that identity change is the mechanism.
    expect(secondsAfter).not.toBe(secondsBefore);
  });

  it('leaves an unchanged figure alone, so the row does not twitch in unison', async () => {
    const { container } = render(<Countdown targetMs={target} />);
    await settle();

    const daysBefore = container.querySelector('.tick');
    await advanceSeconds(1);

    // Days did not change, so React keeps the element and nothing animates.
    expect(container.querySelector('.tick')).toBe(daysBefore);
  });

  it('says the day has come rather than counting past zero', async () => {
    render(<Countdown targetMs={NOW - 1000} />);
    await settle();

    expect(screen.getByText(/היום חוגגים/)).toBeInTheDocument();
  });
});
