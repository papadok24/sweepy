/**
 * Gate for Vitest-only Nitro routes. Production never sets `VITEST`, so these
 * handlers 404 outside the test runner. Prefer this over a second libsql
 * client against the same file the NuxtHub server already holds.
 */
export function requireVitestApi(): void {
  if (!process.env.VITEST) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
}
