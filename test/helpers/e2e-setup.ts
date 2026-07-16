import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'
import {
  SQLITE_URL_ENV,
  TEST_HUB_DIR,
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
 *
 * Pass `frozenNow` (ISO instant) to freeze server Week math via SWEEPY_TEST_NOW.
 * Pass `hubDir` to isolate a suite from the shared `.data/test` SQLite file.
 */
export async function setupE2e(
  options: {
    browser?: boolean
    browserType?: E2eBrowserType
    frozenNow?: string
    hubDir?: string
  } = {},
) {
  const hubDir = options.hubDir ?? TEST_HUB_DIR
  const sqliteUrl = `file:${hubDir}/db/sqlite.db`

  process.env[SQLITE_URL_ENV] = sqliteUrl
  process.env.NUXT_HOUSEHOLD_TIMEZONE = TEST_HOUSEHOLD_TIMEZONE
  if (options.frozenNow) {
    process.env.SWEEPY_TEST_NOW = options.frozenNow
  }
  else {
    delete process.env.SWEEPY_TEST_NOW
  }

  const browser = options.browser ?? false

  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    server: true,
    browser,
    browserOptions: browser
      ? { type: options.browserType ?? 'webkit' }
      : undefined,
    // @nuxt/test-utils defaults teardownTimeout to 30s on Linux; heavy
    // browser suites (many createPage calls) can exceed that on CI afterAll.
    teardownTimeout: 120_000,
    nuxtConfig: {
      hub: {
        dir: hubDir,
      },
      runtimeConfig: {
        householdTimezone: TEST_HOUSEHOLD_TIMEZONE,
      },
    },
  })
}
