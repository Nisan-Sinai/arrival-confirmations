/**
 * Application-level configuration.
 *
 * Note on §0 "No placeholders": the details of a *concrete* event (hosts, honoree,
 * date, venue, phone) are NOT stored here. They live in the `events` table and are
 * entered through the admin screen at /admin/event. That removes the whole class of
 * "remember to replace the placeholder before going live" bugs.
 *
 * What remains here is deployment branding. Any value still equal to a
 * PLACEHOLDER_SENTINEL is rejected by `assertNoPlaceholders()` on a production boot
 * and rendered with a visible marker outside production.
 */

/** Every timestamp shown to a guest is rendered in this zone, always (§5). */
export const EVENT_TIMEZONE = 'Asia/Jerusalem' as const;

export const APP_LOCALE = 'he-IL' as const;

/** Marker for a value that must be replaced before a production deploy. */
export const PLACEHOLDER_SENTINEL = '__REPLACE_ME__' as const;

export interface AppConfig {
  /** Product name shown in the browser tab and Open Graph metadata. */
  readonly siteName: string;
  /** Short description used for SEO and WhatsApp link previews. */
  readonly siteDescription: string;
  /** Support address surfaced on error screens and in the two legal notices. */
  readonly supportEmail: string;
  /**
   * Support telephone. Israeli accessibility regulations expect a statement to name a
   * route to a human, and a phone number is the route an older guest will actually
   * take — which is the population §9 exists for.
   */
  readonly supportPhone: string;
  /** Guest counters are capped here and in a Postgres CHECK constraint (§3). */
  readonly maxAttendeesPerCategory: number;
  /** Invite session lifetime, minutes (§4.3). */
  readonly inviteSessionTtlMinutes: number;
  /** Personal invite token lifetime, days (§4.2). */
  readonly inviteTokenTtlDays: number;
  /** RSVP self-service update token lifetime, days (§6.4). */
  readonly updateTokenTtlDays: number;
  /** Idempotency record lifetime, hours (§6.3). */
  readonly idempotencyTtlHours: number;
  /** Default retention window after the event before guest PII is purged (§14). */
  readonly defaultRetentionDaysAfterEvent: number;
  /** Audit log retention, days (§14). */
  readonly auditLogRetentionDays: number;
}

export const appConfig: AppConfig = {
  siteName: 'אישורי הגעה',
  siteDescription: 'הזמנה דיגיטלית ואישור הגעה לאירוע',
  supportEmail: 'nisan.sinai5@gmail.com',
  supportPhone: '058-7170978',
  maxAttendeesPerCategory: 30,
  inviteSessionTtlMinutes: 120,
  inviteTokenTtlDays: 180,
  updateTokenTtlDays: 60,
  idempotencyTtlHours: 24,
  defaultRetentionDaysAfterEvent: 30,
  auditLogRetentionDays: 365,
};

/*
 * `PLACEHOLDER_ALLOWED_KEYS` used to live here, listing `supportEmail` as tolerated
 * outside production. Every branding value is filled in now, so the list was empty and
 * nothing read it — an exemption mechanism with nothing to exempt. Removed rather than
 * left as an empty array, because an unused escape hatch is an invitation to use one.
 */

export function findPlaceholderKeys(config: AppConfig = appConfig): string[] {
  return Object.entries(config)
    .filter(([, value]) => value === PLACEHOLDER_SENTINEL)
    .map(([key]) => key);
}

export class PlaceholderConfigError extends Error {
  readonly keys: string[];

  constructor(keys: string[]) {
    super(
      `ערכי תצורה שלא הוחלפו לפני עלייה לפרודקשן: ${keys.join(', ')}. ` +
        'ראו SETUP.md — יש להחליף אותם בקובץ config/event.config.ts.',
    );
    this.name = 'PlaceholderConfigError';
    this.keys = keys;
  }
}

/**
 * Fails a production boot while any branding placeholder is still in place (§0, §15).
 * Outside production the placeholders are tolerated and surfaced visually instead.
 */
export function assertNoPlaceholders(
  config: AppConfig = appConfig,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): void {
  if (nodeEnv !== 'production') return;
  const keys = findPlaceholderKeys(config);
  if (keys.length > 0) throw new PlaceholderConfigError(keys);
}
