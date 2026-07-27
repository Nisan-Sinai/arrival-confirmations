import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';

/**
 * Compares the migrations in this repository against the ones the database has run.
 *
 * This exists because of the defect that opened the audit. `repositories/eventRepository.ts`
 * called `get_public_event_by_public_id`, and no migration created it: the function had
 * been applied straight to the live project and never written down. Two migrations were
 * missing that way, and the repository still shipped an obsolete `get_public_event()`
 * that returned an arbitrary active event to any anonymous caller.
 *
 * Nothing caught it. Every check the project had ran against the *live* schema, where
 * the objects existed — so lint, types, tests and the build all passed while a clean
 * provision from `supabase/migrations/` would have produced a database on which every
 * invitation page threw and every RSVP failed.
 *
 * This compares names rather than version numbers on purpose. The timestamps in a file
 * name and the ones in `supabase_migrations.schema_migrations` diverge as soon as a
 * migration is written by hand or applied out of order, and drift in the *set* is the
 * thing that matters.
 *
 *   pnpm check:schema-drift
 */

loadEnv({ path: '.env.local', quiet: true });

/** `20260726001200_public_event_by_public_id.sql` → `public_event_by_public_id`. */
function migrationName(fileName: string): string | null {
  const match = /^\d+_(.+)\.sql$/.exec(fileName);
  return match?.[1] ?? null;
}

async function main(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (url === undefined || url === '') {
    console.error('חסר TEST_DATABASE_URL — צריך מחרוזת חיבור למסד כדי להשוות.');
    process.exitCode = 2;
    return;
  }

  const files = await readdir(join(process.cwd(), 'supabase', 'migrations'));
  const inRepo = new Set(files.map(migrationName).filter((name): name is string => name !== null));

  const pool = new Pool({ connectionString: url, max: 1 });
  let inDatabase: Set<string>;
  try {
    const { rows } = await pool.query<{ name: string | null }>(
      'select name from supabase_migrations.schema_migrations order by version',
    );
    inDatabase = new Set(rows.map((r) => r.name).filter((n): n is string => n !== null));
  } finally {
    await pool.end();
  }

  const missingFromRepo = [...inDatabase].filter((name) => !inRepo.has(name));
  const missingFromDatabase = [...inRepo].filter((name) => !inDatabase.has(name));

  console.log(`מיגרציות בריפו: ${inRepo.size} · במסד: ${inDatabase.size}`);

  if (missingFromRepo.length > 0) {
    console.log('');
    console.log('❌ הורצו על המסד ואינן בריפו — הקמה נקייה תחסיר אותן:');
    missingFromRepo.forEach((name) => console.log(`     ${name}`));
  }

  if (missingFromDatabase.length > 0) {
    console.log('');
    // Not always an error: a migration can legitimately be written and not yet applied.
    console.log('⚠  קיימות בריפו ולא הורצו על המסד:');
    missingFromDatabase.forEach((name) => console.log(`     ${name}`));
  }

  if (missingFromRepo.length === 0 && missingFromDatabase.length === 0) {
    console.log('');
    console.log('✅ הריפו והמסד מסכימים על אותה קבוצת מיגרציות.');
    return;
  }

  // Only the first direction is fatal. A migration the database has and the repository
  // does not is unreproducible by definition — that is the bug this script exists for.
  if (missingFromRepo.length > 0) process.exitCode = 1;
}

// `void main()` rather than top-level await: tsx compiles this to CJS, where a
// top-level await is a build error rather than a runtime one.
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'הבדיקה נכשלה');
  process.exitCode = 1;
});
