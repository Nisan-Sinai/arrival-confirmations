import { config as loadEnv } from 'dotenv';

import { appConfig } from '../config/event.config';

/**
 * Runs the retention purge (§14).
 *
 * The privacy notice promises every guest that their details are erased within
 * `defaultRetentionDaysAfterEvent` of the event. This is the thing that keeps that
 * promise, and it is deliberately a script rather than a route: nothing user-facing
 * should be able to trigger a bulk erase, and the schedule belongs to whatever runs it
 * — a Vercel cron, a GitHub Action, or a person on the first of the month.
 *
 *   pnpm data:retention:cleanup            # dry run — reports, changes nothing
 *   pnpm data:retention:cleanup --apply    # performs the purge
 *
 * Dry run is the default on purpose. A destructive job whose safe mode requires a flag
 * gets run destructively by accident exactly once.
 */

loadEnv({ path: '.env.local', quiet: true });

interface PurgeResult {
  readonly events_processed: number;
  readonly rsvps_anonymised: number;
  readonly guests_deleted: number;
  readonly invite_sessions_deleted: number;
  readonly idempotency_keys_deleted: number;
  readonly audit_logs_deleted: number;
}

const LABELS: Record<keyof PurgeResult, string> = {
  events_processed: 'אירועים שעברו את תקופת השמירה',
  rsvps_anonymised: 'אישורי הגעה שעברו אנונימיזציה',
  guests_deleted: 'רשומות אורחים שנמחקו',
  invite_sessions_deleted: 'סשני הזמנה שנמחקו',
  idempotency_keys_deleted: 'מפתחות idempotency שנמחקו',
  audit_logs_deleted: 'רשומות ביקורת שנמחקו',
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    console.error(`חסר משתנה סביבה: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  // Imported here rather than at module scope so `--help` and the env check above run
  // without constructing a privileged client.
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('purge_expired_guest_data', {
    p_retention_days: appConfig.defaultRetentionDaysAfterEvent,
    p_audit_retention_days: appConfig.auditLogRetentionDays,
    p_dry_run: !apply,
  });

  if (error) {
    // §13: the driver's message can name the host and the connection.
    console.error(`purge_expired_guest_data נכשלה (${error.code ?? 'unknown'})`);
    process.exit(1);
  }

  const result = (Array.isArray(data) ? data[0] : data) as PurgeResult | undefined;
  if (result === undefined) {
    console.error('הפונקציה לא החזירה תוצאה.');
    process.exit(1);
  }

  console.log(
    apply
      ? `מחיקת נתונים בוצעה (שמירה: ${appConfig.defaultRetentionDaysAfterEvent} ימים לאחר האירוע)`
      : `הרצה יבשה — לא בוצע שום שינוי. הוסיפו --apply כדי לבצע.`,
  );
  for (const [key, label] of Object.entries(LABELS)) {
    console.log(`  ${String(result[key as keyof PurgeResult]).padStart(6)}  ${label}`);
  }

  // Never the guests' details, only how many there were. A retention job that logged
  // what it erased would defeat its own purpose (§14).
}

// `void main()` rather than top-level await: tsx compiles this file to CJS, where a
// top-level await is a build error rather than a runtime one.
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'הרצה נכשלה');
  process.exit(1);
});
