import { config as loadEnv } from 'dotenv';

/**
 * Tells you whether Supabase will honour a redirect back to your site.
 *
 * The failure this diagnoses is silent by design: if `redirect_to` is not in the
 * project's allowlist, Supabase does not reject it — it quietly substitutes the Site
 * URL. So a recovery email is sent, the link is valid, and the user lands somewhere
 * that is not your application, with nothing in any log to explain it. That is exactly
 * how password recovery failed here: Site URL was still `http://localhost:3000`.
 *
 * Sends a deliberately invalid token and looks only at where the redirect goes. The
 * token is meant to fail; the destination is the answer.
 *
 *   pnpm check:auth-urls                       # uses .env.local
 *   pnpm check:auth-urls https://your-site     # checks a specific origin
 */

loadEnv({ path: '.env.local', quiet: true });

function projectRef(supabaseUrl: string | undefined): string | null {
  if (supabaseUrl === undefined) return null;
  return /https?:\/\/([a-z]{20})\.supabase\.co/.exec(supabaseUrl)?.[1] ?? null;
}

async function main(): Promise<void> {
  const ref = projectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const origin = process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL;

  if (ref === null) {
    console.error('לא הצלחתי לזהות את מזהה הפרויקט מ-NEXT_PUBLIC_SUPABASE_URL.');
    process.exitCode = 2;
    return;
  }
  if (origin === undefined || origin === '') {
    console.error('העבירו כתובת אתר, או הגדירו NEXT_PUBLIC_SITE_URL.');
    process.exitCode = 2;
    return;
  }

  const target = `${origin}/auth/callback?next=/reset-password`;
  const url =
    `https://${ref}.supabase.co/auth/v1/verify` +
    `?token=bogus&type=recovery&redirect_to=${encodeURIComponent(target)}`;

  const response = await fetch(url, { redirect: 'manual' });
  // The fragment carries the (expected) token error; only the origin and path matter.
  const landed = (response.headers.get('location') ?? '').split('#')[0] ?? '';

  console.log(`ביקשנו הפניה אל : ${target}`);
  console.log(`Supabase הפנה אל : ${landed === '' ? '(אין)' : landed}`);
  console.log('');

  if (landed.startsWith(origin)) {
    console.log('✅ ההגדרה תקינה — קישורי אימות ואיפוס יגיעו לאתר.');
    return;
  }

  console.log('❌ Supabase מתעלם מכתובת ההפניה ונופל ל-Site URL.');
  console.log('   Authentication → URL Configuration:');
  console.log(`     Site URL      = ${origin}`);
  console.log(`     Redirect URLs = ${origin}/**   (וגם http://localhost:3000/** לפיתוח)`);
  process.exitCode = 1;
}

// `void main()` rather than top-level await: tsx compiles this to CJS, where a
// top-level await is a build error rather than a runtime one.
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'הבדיקה נכשלה');
  process.exitCode = 1;
});
