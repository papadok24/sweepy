import { dirname } from 'node:path'
import { mkdirSync } from 'node:fs'

/** NuxtHub local storage root used by `pnpm dev` / `pnpm db:seed`. */
export const DEV_HUB_DIR = '.data'

/**
 * Isolated NuxtHub storage root for e2e — `{TEST_HUB_DIR}/db/sqlite.db`.
 * Kept under `.data/` (gitignored) but separate from the development file.
 */
export const TEST_HUB_DIR = '.data/test'

export const DEV_SQLITE_URL = `file:${DEV_HUB_DIR}/db/sqlite.db`
export const TEST_SQLITE_URL = `file:${TEST_HUB_DIR}/db/sqlite.db`

/** Env override so seed/fixtures open the same file as the NuxtHub e2e server. */
export const SQLITE_URL_ENV = 'SWEEPY_SQLITE_URL'

export function resolveSqliteUrl(fallback = DEV_SQLITE_URL): string {
  return process.env[SQLITE_URL_ENV] || fallback
}

export function ensureSqliteDir(url: string): void {
  const filePath = url.replace(/^file:/, '')
  mkdirSync(dirname(filePath), { recursive: true })
}
