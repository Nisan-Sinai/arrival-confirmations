import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
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
  plugins: [tsconfigPaths(), react()],
  resolve: {
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
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'features/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'services/**/*.{ts,tsx}',
        'repositories/**/*.{ts,tsx}',
        'schemas/**/*.ts',
        'config/**/*.ts',
      ],
      // Every entry here is justified individually in TESTING.md (§10.1).
      exclude: [
        'types/database.types.ts',
        '**/*.d.ts',
        'components/ui/**',
        'app/**/layout.tsx',
        'app/globals.css',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
