import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { clientEnv } from '@/lib/env.client';
import { getServerEnv } from '@/lib/server/env';
import type { Database } from '@/types/database.types';

/**
 * The two Supabase clients, and the rule for choosing between them (§4.5).
 *
 * `createUserClient` carries the visitor's session and is therefore subject to RLS.
 * It is the default: everything the access matrix in §4.1 already permits should go
 * through it, so that a mistake in application code is still caught by a policy.
 *
 * `createPrivilegedClient` uses the service role and bypasses RLS entirely. It is
 * for the handful of operations no policy can express — minting an invite token,
 * exchanging it for a session, calling the transactional submit function on behalf
 * of an anonymous guest. Every call site is a place where a bug has no second line
 * of defence, which is why there are so few of them.
 *
 * `server-only` at the top means importing this file from a Client Component fails
 * the build rather than shipping the service role key to a browser.
 */

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * A client bound to the caller's Supabase session, for admin routes (§8).
 *
 * Reads and writes the auth cookies through Next.js, so a refreshed token is
 * persisted. The `setAll` guard is required rather than defensive: Next.js forbids
 * mutating cookies while rendering a Server Component, and the middleware refreshes
 * the session anyway, so the correct behaviour in that context is to do nothing.
 */
export async function createUserClient(): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render. The middleware owns refresh here.
          }
        },
      },
    },
  );
}

/**
 * A client with the service role. Bypasses RLS — treat every use as a policy
 * exception that has to justify itself.
 *
 * Deliberately not memoised at module scope. A cached privileged client is easy to
 * capture accidentally in a closure that outlives the request, and on a serverless
 * runtime the saved construction cost is negligible against the network call that
 * follows.
 */
export function createPrivilegedClient(): TypedSupabaseClient {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  return createClient<Database>(clientEnv.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // No session to persist and none to refresh: this client is never a user.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      // Makes privileged traffic identifiable in Supabase's logs, which is the
      // difference between auditing these calls and guessing at them.
      headers: { 'x-application-name': 'arrival-confirmations/server' },
    },
  });
}

/**
 * An anon-key client with no user session, for the public invitation page.
 *
 * §4.6 restricts anonymous access to `get_public_event()`, and this client holds no
 * more authority than an anonymous browser would. It exists so that server-rendered
 * public pages do not reach for the privileged client out of convenience.
 */
export function createAnonymousClient(): TypedSupabaseClient {
  return createClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
}
