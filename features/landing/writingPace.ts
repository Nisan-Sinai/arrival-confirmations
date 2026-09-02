/**
 * The pace of the written headings, shared by the component and by anyone stacking lines.
 *
 * A module of its own rather than an export from `WrittenHeading`, because that became a
 * client component when the scroll trigger needed an observer — and a server component
 * calling a function out of a `'use client'` module is a build error, not a warning:
 *
 *     Attempted to call writingDuration() from the server but writingDuration is on the
 *     client.
 *
 * The pace is plain arithmetic with no client in it, so it belongs on the boundary rather
 * than behind it. `LandingPage` renders on the server and needs the number to start its
 * second line as the first one ends.
 */

/** Milliseconds per character. The whole rhythm of the effect is this number. */
export const MS_PER_CHARACTER = 38;

/**
 * Milliseconds as a number of seconds, rounded to the millisecond.
 *
 * Without the rounding, a delay of six characters plus a line's worth of them came out of
 * binary floating point as `0.9119999999999999s` and went into the DOM that way. Harmless
 * to the animation and not something to hand a reader viewing source, and it would make
 * any test of these values needlessly brittle.
 */
export function seconds(ms: number): number {
  return Math.round(ms) / 1000;
}

/**
 * How long `text` takes to write, in seconds.
 *
 * Exported so a caller stacking one line after another can start the second exactly as the
 * first finishes, and the caret carries straight on rather than restarting. A function
 * rather than a hand-tuned constant so the two cannot drift apart when the copy changes.
 */
export function writingDuration(text: string): number {
  return seconds(text.replace(/\s/g, '').length * MS_PER_CHARACTER);
}
