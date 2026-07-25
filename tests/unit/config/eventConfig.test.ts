import { describe, expect, it } from 'vitest';

import {
  APP_LOCALE,
  EVENT_TIMEZONE,
  PLACEHOLDER_SENTINEL,
  PlaceholderConfigError,
  appConfig,
  assertNoPlaceholders,
  findPlaceholderKeys,
  type AppConfig,
} from '@/config/event.config';

const cleanConfig: AppConfig = { ...appConfig, supportEmail: 'support@example.com' };

describe('app configuration', () => {
  it('pins every guest-facing timestamp to Israel time', () => {
    expect(EVENT_TIMEZONE).toBe('Asia/Jerusalem');
    expect(APP_LOCALE).toBe('he-IL');
  });

  it('keeps the attendee cap aligned with the database CHECK constraint', () => {
    expect(appConfig.maxAttendeesPerCategory).toBe(30);
  });

  it('uses positive lifetimes for every token and session', () => {
    expect(appConfig.inviteSessionTtlMinutes).toBeGreaterThan(0);
    expect(appConfig.inviteTokenTtlDays).toBeGreaterThan(0);
    expect(appConfig.updateTokenTtlDays).toBeGreaterThan(0);
    expect(appConfig.idempotencyTtlHours).toBeGreaterThan(0);
    expect(appConfig.defaultRetentionDaysAfterEvent).toBeGreaterThan(0);
    expect(appConfig.auditLogRetentionDays).toBeGreaterThan(0);
  });

  describe('findPlaceholderKeys', () => {
    it('reports keys still holding the sentinel', () => {
      expect(findPlaceholderKeys({ ...cleanConfig, supportEmail: PLACEHOLDER_SENTINEL })).toEqual([
        'supportEmail',
      ]);
    });

    it('returns an empty list once every value is real', () => {
      expect(findPlaceholderKeys(cleanConfig)).toEqual([]);
    });

    it('defaults to the shipped configuration', () => {
      expect(findPlaceholderKeys()).toEqual(['supportEmail']);
    });
  });

  describe('assertNoPlaceholders', () => {
    it('fails a production boot while a placeholder remains', () => {
      expect(() =>
        assertNoPlaceholders({ ...cleanConfig, supportEmail: PLACEHOLDER_SENTINEL }, 'production'),
      ).toThrow(PlaceholderConfigError);
    });

    it('names the offending keys in the error', () => {
      try {
        assertNoPlaceholders({ ...cleanConfig, supportEmail: PLACEHOLDER_SENTINEL }, 'production');
        expect.unreachable('expected assertNoPlaceholders to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(PlaceholderConfigError);
        expect((error as PlaceholderConfigError).keys).toEqual(['supportEmail']);
        expect((error as Error).message).toContain('supportEmail');
      }
    });

    it('passes in production once the placeholders are replaced', () => {
      expect(() => assertNoPlaceholders(cleanConfig, 'production')).not.toThrow();
    });

    it.each(['development', 'test', undefined])(
      'tolerates placeholders when NODE_ENV is %s',
      (nodeEnv) => {
        expect(() =>
          assertNoPlaceholders({ ...cleanConfig, supportEmail: PLACEHOLDER_SENTINEL }, nodeEnv),
        ).not.toThrow();
      },
    );

    it('reads NODE_ENV from the process by default', () => {
      expect(() => assertNoPlaceholders()).not.toThrow();
    });
  });
});
