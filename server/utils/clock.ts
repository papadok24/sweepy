/**
 * Server “now” for Week math. Under Vitest, `SWEEPY_TEST_NOW` (ISO instant)
 * freezes the clock so API suites can assert Monday boundaries.
 */
export function serverNow(): Date {
  if (process.env.VITEST) {
    const frozen = process.env.SWEEPY_TEST_NOW
    if (frozen) {
      const instant = new Date(frozen)
      if (!Number.isNaN(instant.getTime())) return instant
    }
  }
  return new Date()
}
