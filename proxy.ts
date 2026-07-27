import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Keeps the Supabase session fresh and turns away anonymous visitors to /dashboard.
 *
 * This is a convenience and a redirect, not the access control. §4.4: every route
 * checks for itself, and RLS scopes every row regardless. A proxy that was the only
 * guard would be one misconfigured matcher away from exposing everything.
 *
 * Named `proxy` in `proxy.ts` rather than `middleware` in `middleware.ts`: Next.js 16
 * deprecated the old convention, and every build printed a warning about it. The
 * behaviour is unchanged — this is the same function under the name the framework now
 * expects.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser rather than getSession: it validates the token with the auth server
  // instead of trusting a cookie the browser could have been handed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null && request.nextUrl.pathname.startsWith('/dashboard')) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  // Static assets and images never need a session refresh.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
