import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'
import {
  SQLITE_URL_ENV,
  TEST_HUB_DIR,
  TEST_SQLITE_URL,
} from './sqlite.ts'

export type E2eBrowserType = 'chromium' | 'firefox' | 'webkit'

/**
 * Boot Nuxt for e2e against an isolated hub dir so tests never write the
 * development SQLite file (`.data/db/sqlite.db`).
 *
 * Pass `browserType: 'webkit'` for the iOS Safari support bar (ADR 0007).
 * Default browser engine remains Chromium when `browser: true` and type is omitted.
 */
export async function setupE2e(
  options: { browser?: boolean, browserType?: E2eBrowserType } = {},
) {
  process.env[SQLITE_URL_ENV] = TEST_SQLITE_URL

  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    server: true,
    browser: options.browser ?? false,
    browserOptions: options.browserType
      ? { type: options.browserType }
      : undefined,
    nuxtConfig: {
      hub: {
        dir: TEST_HUB_DIR,
      },
    },
  })
}
