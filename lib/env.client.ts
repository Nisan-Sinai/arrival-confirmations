import { z } from 'zod';

/**
 * Public environment, safe to reach the browser bundle (§4.5).
 *
 * `process.env.NEXT_PUBLIC_*` is referenced literally on purpose: Next.js inlines
 * these at build time only when it can see the full property access statically.
 */

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL חייב להיות כתובת URL תקינה'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY קצר מדי — ודאו שהועתק במלואו'),
  NEXT_PUBLIC_SITE_URL: z.string().url('NEXT_PUBLIC_SITE_URL חייב להיות כתובת URL תקינה'),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export class EnvValidationError extends Error {
  readonly issues: string[];

  constructor(scope: string, issues: string[]) {
    super(`תצורת סביבה שגויה (${scope}):\n- ${issues.join('\n- ')}`);
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}

function asHttpsOrigin(hostOrUrl: string | undefined): string | undefined {
  if (hostOrUrl === undefined || hostOrUrl.trim() === '') return undefined;
  const value = hostOrUrl.trim();
  return value.startsWith('http://') || value.startsWith('https://')
    ? value
    : `https://${value}`;
}

/**
 * Vercel Preview deployments have their own generated URL, while canonical metadata
 * should continue to point at production. When NEXT_PUBLIC_SITE_URL is not explicitly
 * copied to the Preview environment, Vercel exposes the production project URL (and,
 * as a final fallback, the current deployment URL) through framework-prefixed system
 * variables. Using them here keeps Preview builds from failing only because this one
 * public URL was scoped to Production in the dashboard.
 */
function resolveSiteUrl(source: Record<string, string | undefined>): string | undefined {
  return (
    asHttpsOrigin(source.NEXT_PUBLIC_SITE_URL) ??
    asHttpsOrigin(source.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) ??
    asHttpsOrigin(source.NEXT_PUBLIC_VERCEL_URL)
  );
}

export function parseClientEnv(source: Record<string, string | undefined>): ClientEnv {
  const result = clientEnvSchema.safeParse({
    ...source,
    NEXT_PUBLIC_SITE_URL: resolveSiteUrl(source),
  });
  if (!result.success) {
    throw new EnvValidationError(
      'client',
      result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }
  return result.data;
}

export const clientEnv: ClientEnv = parseClientEnv({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL:
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
  NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
});
