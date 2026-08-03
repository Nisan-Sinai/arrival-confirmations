import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public liveness and release identity endpoint.
 *
 * A green Vercel check only proves that a deployment finished. It does not prove that
 * the production alias points at that deployment. Returning the immutable Git commit
 * lets the post-deploy smoke test verify the exact release users are receiving.
 */
export function GET() {
  const release =
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'local-development';

  return NextResponse.json(
    {
      status: 'ok',
      release,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    },
  );
}
