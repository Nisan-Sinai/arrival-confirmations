import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/utils';

/**
 * The class merger every primitive in `components/ui/` depends on.
 *
 * It looks trivial enough not to need a test, which is exactly why it did not have
 * one. The behaviour that matters is the last case: if `twMerge` were dropped for a
 * plain join, a caller-supplied `className` would stop overriding the component's
 * default and every `<Button className="bg-destructive">` in the codebase would
 * silently keep its original background.
 */
describe('cn', () => {
  it('joins plain class names', () => {
    expect(cn('rounded-full', 'font-semibold')).toBe('rounded-full font-semibold');
  });

  it('drops falsy entries so a conditional does not emit "false"', () => {
    expect(cn('base', false && 'never', undefined, null, 'kept')).toBe('base kept');
  });

  it('accepts the object and array forms clsx supports', () => {
    expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
  });

  it('lets the last conflicting Tailwind utility win', () => {
    expect(cn('px-4', 'px-8')).toBe('px-8');
    expect(cn('bg-primary', 'bg-destructive')).toBe('bg-destructive');
  });

  it('keeps utilities that only look like they conflict', () => {
    // Different axes, so both have to survive the merge.
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('returns an empty string for no input', () => {
    expect(cn()).toBe('');
  });
});
