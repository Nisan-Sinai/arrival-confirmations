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
  /**
   * Google Search Console's verification token (§12). Optional, because the site runs
   * perfectly well unverified — it only decides whether the owner can submit the
   * sitemap and see what Google thinks of the site. It is public by construction: the
   * whole mechanism is a meta tag Google reads off the page.
   */
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: z.string().min(1).optional(),
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

export function parseClientEnv(source: Record<string, string | undefined>): ClientEnv {
  const result = clientEnvSchema.safeParse(source);
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
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
});
