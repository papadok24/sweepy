import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.{test,spec}.ts'],
    environment: 'node',
    // API (`test/api`) and browser e2e (`test/e2e`) each `await setupE2e()`
    // inside async `describe`, booting Nuxt against `.data/test/db/sqlite.db`
    // (isolated from `.data/db/sqlite.db`). Browser suites use WebKit only.
    // Parallel workers still race that shared *test* DB (concurrent suite
    // writes), so keep serial file execution.
    fileParallelism: false,
    maxWorkers: 1,
    pool: 'forks',
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
})
