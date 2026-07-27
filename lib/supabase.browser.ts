import { createBrowserClient } from '@supabase/ssr';

import { clientEnv } from '@/lib/env.client';
import type { Database } from '@/types/database.types';

/**
 * A Supabase client for the browser (§4.5).
 *
 * Exists for exactly one job: completing an implicit-flow auth link, where the tokens
 * arrive in the URL fragment and the server therefore cannot see them. Everything else
 * in this application talks to Supabase from the server, and should keep doing so —
 * this client holds the anon key and is subject to RLS like any other browser.
 *
 * `createBrowserClient` rather than `createClient`: it writes the session to cookies in
 * the format `@supabase/ssr` reads on the server, so a session established here is
 * visible to the next server render. `createClient` would put it in localStorage, where
 * no Server Component could ever find it, and the user would appear signed out the
 * moment they navigated.
 */
export function createClientSideClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
