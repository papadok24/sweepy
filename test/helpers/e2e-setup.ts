import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'
import {
  SQLITE_URL_ENV,
  TEST_HUB_DIR,
  TEST_SQLITE_URL,
} from './sqlite.ts'

export type E2eBrowserType = 'chromium' | 'firefox' | 'webkit'

/** IANA zone for test household settings seed (ADR 0008). */
export const TEST_HOUSEHOLD_TIMEZONE = 'America/Chicago'

/**
 * Boot Nuxt against an isolated hub dir so tests never write the development
 * SQLite file (`.data/db/sqlite.db`).
 *
 * When `browser: true`, defaults to WebKit (ADR 0007 iOS Safari support bar).
 * CI installs WebKit only — Chromium is not used in CI.
 */
export async function setupE2e(
  options: { browser?: boolean, browserType?: E2eBrowserType } = {},
) {
  process.env[SQLITE_URL_ENV] = TEST_SQLITE_URL
  process.env.NUXT_HOUSEHOLD_TIMEZONE = TEST_HOUSEHOLD_TIMEZONE

  const browser = options.browser ?? false

  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    server: true,
    browser,
    browserOptions: browser
      ? { type: options.browserType ?? 'webkit' }
      : undefined,
    nuxtConfig: {
      hub: {
        dir: TEST_HUB_DIR,
      },
      runtimeConfig: {
        householdTimezone: TEST_HOUSEHOLD_TIMEZONE,
      },
    },
  })
}
