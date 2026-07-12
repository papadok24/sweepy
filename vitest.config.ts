import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.{test,spec}.ts'],
    environment: 'node',
    // E2E suites each `await setupE2e()` inside async `describe`, booting Nuxt
    // against `.data/test/db/sqlite.db` (isolated from `.data/db/sqlite.db`).
    // Parallel workers still race that shared *test* DB (SQLITE_BUSY / native
    // access-violation crashes on Windows), so keep serial file execution.
    fileParallelism: false,
    maxWorkers: 1,
    pool: 'forks',
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
})
