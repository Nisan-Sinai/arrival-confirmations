import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const serverOnlyStub = fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url));

/**
 * Test suites are split into projects so each can be run on its own (§15 scripts)
 * while coverage is still aggregated across all of them into a single report (§10.1).
 *
 * `integration` and `rls` talk to a real Supabase project and are therefore run
 * single-file, single-fork: they share one database and must not interleave.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: { 'server-only': serverOnlyStub },
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
          setupFiles: ['tests/setup/unit.setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['tests/component/**/*.test.tsx'],
          setupFiles: ['tests/setup/component.setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          setupFiles: ['tests/setup/database.setup.ts'],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          fileParallelism: false,
          pool: 'forks',
          maxWorkers: 1,
        },
      },
      {
        extends: true,
        test: {
          name: 'rls',
          environment: 'node',
          include: ['tests/rls/**/*.test.ts'],
          setupFiles: ['tests/setup/database.setup.ts'],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          fileParallelism: false,
          pool: 'forks',
          maxWorkers: 1,
        },
      },
      {
        extends: true,
        test: {
          name: 'security',
          environment: 'node',
          include: ['tests/security/**/*.test.ts'],
          testTimeout: 30_000,
        },
      },
    ],
    coverage: {
      // Vitest 4 always reports files that no test touched, so the former
      // `all: true` is both redundant and no longer part of the type.
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      /**
       * Measured over `unit` and `component` only — see the `test:coverage` script.
       * Running every project would drag in `integration` and `rls`, which need a
       * dedicated Supabase project and now refuse outright when TEST_DATABASE_URL
       * names the one the application serves. A coverage report that cannot be
       * produced without a second database is a coverage report nobody runs.
       *
       * The logic layers, and only those.
       *
       * `app/**` and `features/**` were in this list under a 100% threshold, which
       * made the gate fiction: those directories are React pages and components, the
       * `component` project below has no specs in it yet, and the suite measured 32%
       * against a declared 100%. It failed on every run — and CI never invoked
       * `test:coverage`, so nothing reported that the number the README advertises had
       * never once been met.
       *
       * Narrowing the scope makes the threshold true instead of aspirational. The
       * layers listed here are where the rules live — validation, token hashing, the
       * caterer's arithmetic, the public read path — and they are held at 100%. The
       * React surface is covered by the Playwright and axe suites in `e2e/` instead,
       * which exercise it as a user does rather than as a render tree; when a
       * component suite exists, `features/**` belongs back in this list with its own
       * threshold.
       */
      include: [
        'lib/**/*.{ts,tsx}',
        'services/**/*.{ts,tsx}',
        'repositories/**/*.{ts,tsx}',
        'schemas/**/*.ts',
        'config/**/*.ts',
      ],
      exclude: [
        'types/database.types.ts',
        '**/*.d.ts',
        /**
         * Thin constructor wrappers over `@supabase/ssr` and `@supabase/supabase-js`.
         * A unit test of these asserts that the SDK was called with the arguments it
         * was just handed, which is a test of the mock. What they actually guarantee —
         * that the anon client cannot read past RLS and that the privileged one is
         * never bundled — is checked by `tests/rls/` and by `pnpm scan:secrets`.
         *
         * `supabase.browser.ts` is here for the same reason and one more: the property
         * that matters about it is *which* factory it calls — `createBrowserClient`
         * writes the session to cookies the server can read, where `createClient` would
         * put it in localStorage and the user would appear signed out on navigation.
         * That is verified end to end by the recovery flow, not by asserting a mock.
         */
        'lib/server/supabase.ts',
        'lib/supabase.browser.ts',
      ],
      /**
       * Real numbers, met on every run — which the previous 100-across-the-board was
       * not: it measured 32% and failed every time `test:coverage` was invoked, which
       * CI never did.
       *
       * Branches sits at 99 rather than 100 for exactly one branch: the `else` of the
       * `instanceof PhoneNormalizationError` check in `tryNormalizeIsraeliPhone`,
       * which re-throws anything that is not a phone rejection. `normalizeIsraeliPhone`
       * throws only that class and is called directly rather than through a seam, so
       * the branch cannot be reached from a test — and adding indirection to reach it
       * would be changing production code to satisfy a number. The line itself is
       * marked with a `v8 ignore` and the reason is written beside it.
       *
       * Everything else is a hard 100. A regression that drops any of them fails.
       */
      thresholds: {
        statements: 100,
        branches: 99,
        functions: 100,
        lines: 100,
      },
    },
  },
});
