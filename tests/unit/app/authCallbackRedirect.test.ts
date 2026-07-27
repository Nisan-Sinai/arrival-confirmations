import { describe, expect, it } from 'vitest';

import { DEFAULT_REDIRECT, safeNextPath } from '@/lib/safeRedirect';

/**
 * Open-redirect protection on the OAuth / email-link callback.
 *
 * `/auth/callback` takes a `next` parameter so a recovery mail can land the host on
 * `/reset-password` rather than the dashboard. The parameter is attacker-supplied by
 * construction, so every assertion below is a URL somebody could put in a link and
 * mail to a host.
 */
describe('safeNextPath', () => {
  it('honours a same-origin path', () => {
    expect(safeNextPath('/reset-password')).toBe('/reset-password');
    expect(safeNextPath('/dashboard/events/new')).toBe('/dashboard/events/new');
  });

  it('keeps a query string and a fragment on an allowed path', () => {
    expect(safeNextPath('/dashboard?tab=replies#top')).toBe('/dashboard?tab=replies#top');
  });

  it('falls back to the dashboard when nothing was asked for', () => {
    expect(safeNextPath(null)).toBe(DEFAULT_REDIRECT);
    expect(safeNextPath(undefined)).toBe(DEFAULT_REDIRECT);
    expect(safeNextPath('')).toBe(DEFAULT_REDIRECT);
  });

  it('refuses an absolute URL to another origin', () => {
    expect(safeNextPath('https://evil.example/steal')).toBe(DEFAULT_REDIRECT);
    expect(safeNextPath('http://evil.example')).toBe(DEFAULT_REDIRECT);
  });

  /**
   * The case a bare `startsWith('/')` check lets through, and the reason this function
   * exists at all: `//evil.example` is a protocol-relative URL. It begins with a slash
   * and navigates straight off the site.
   */
  it('refuses a protocol-relative URL', () => {
    expect(safeNextPath('//evil.example')).toBe(DEFAULT_REDIRECT);
    expect(safeNextPath('//evil.example/path')).toBe(DEFAULT_REDIRECT);
  });

  /** Some agents normalise a backslash to a slash, making this a second way in. */
  it('refuses the backslash variant of the same trick', () => {
    expect(safeNextPath('/\\evil.example')).toBe(DEFAULT_REDIRECT);
  });

  it('refuses a scheme that is not a path at all', () => {
    expect(safeNextPath('javascript:alert(1)')).toBe(DEFAULT_REDIRECT);
    expect(safeNextPath('data:text/html,<script>alert(1)</script>')).toBe(DEFAULT_REDIRECT);
    expect(safeNextPath('mailto:someone@example.com')).toBe(DEFAULT_REDIRECT);
  });
});
