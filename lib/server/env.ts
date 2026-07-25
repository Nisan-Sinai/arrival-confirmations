import 'server-only';

import { z } from 'zod';

import { EnvValidationError } from '@/lib/env.client';

/**
 * Server-only environment (§4.5).
 *
 * Nothing here may be prefixed with NEXT_PUBLIC_, and this module must never be
 * imported from a Client Component. The `server-only` import above turns such an
 * import into a build error, and `tests/security/bundle-secrets.test.ts` greps the
 * built browser assets to prove the values never ship.
 */

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20, 'SUPABASE_SERVICE_ROLE_KEY קצר מדי — ודאו שהועתק במלואו'),
  /** Pepper mixed into every token hash so a database dump alone cannot verify tokens. */
  TOKEN_PEPPER: z.string().min(32, 'TOKEN_PEPPER חייב להיות באורך 32 תווים לפחות'),
  /** Separate pepper for hashing resolved client IPs (§4.8). Never reuse TOKEN_PEPPER. */
  IP_HASH_PEPPER: z.string().min(32, 'IP_HASH_PEPPER חייב להיות באורך 32 תווים לפחות'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(
      'server',
      result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }
  if (result.data.TOKEN_PEPPER === result.data.IP_HASH_PEPPER) {
    throw new EnvValidationError('server', [
      'TOKEN_PEPPER ו-IP_HASH_PEPPER חייבים להיות ערכים שונים',
    ]);
  }
  return result.data;
}

let cached: ServerEnv | null = null;

/**
 * Lazily validated so that importing a server module during a build (where the
 * secrets are intentionally absent) does not fail; the first actual use does.
 */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

/** Test seam: drops the memoised value so a test can supply a different environment. */
export function resetServerEnvCache(): void {
  cached = null;
}
