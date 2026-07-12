import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'
import {
  SQLITE_URL_ENV,
  TEST_HUB_DIR,
  TEST_SQLITE_URL,
} from './sqlite.ts'

/**
 * Boot Nuxt for e2e against an isolated hub dir so tests never write the
 * development SQLite file (`.data/db/sqlite.db`).
 */
export async function setupE2e(options: { browser?: boolean } = {}) {
  process.env[SQLITE_URL_ENV] = TEST_SQLITE_URL

  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    server: true,
    browser: options.browser ?? false,
    nuxtConfig: {
      hub: {
        dir: TEST_HUB_DIR,
      },
    },
  })
}
