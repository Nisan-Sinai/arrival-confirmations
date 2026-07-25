/**
 * Test stub for the `server-only` package.
 *
 * The real package throws on import outside a React Server Components graph, which
 * would make every server module untestable under Vitest. Aliasing it here keeps the
 * production guarantee intact — Next.js still resolves the real package during a
 * build, so importing a server module from a Client Component remains a build error.
 */
export {};
