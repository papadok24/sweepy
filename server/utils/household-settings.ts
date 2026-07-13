import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { db, schema } from 'hub:db'
import { serverNow } from './clock'
import { useEnv } from './env'
import { isUniqueViolation } from './db-errors'
import { weekClockAt, type WeekClock } from './week'

const SETTINGS_ROW_ID = 1

/**
 * Resolve the household IANA timezone. DB row wins when present. If missing,
 * seed once from `NUXT_HOUSEHOLD_TIMEZONE`. Fail closed only when both are
 * absent — never invent UTC (ADR 0008).
 */
export async function resolveHouseholdTimezone(event?: H3Event): Promise<string> {
  const existing = await db
    .select()
    .from(schema.householdSettings)
    .where(eq(schema.householdSettings.id, SETTINGS_ROW_ID))
    .get()

  if (existing) {
    return existing.timezone
  }

  const timezone = useEnv(event).householdTimezone
  if (!timezone) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Household timezone is not configured (missing settings row and NUXT_HOUSEHOLD_TIMEZONE)',
    })
  }

  try {
    await db.insert(schema.householdSettings).values({
      id: SETTINGS_ROW_ID,
      timezone,
    })
    return timezone
  }
  catch (error) {
    if (!isUniqueViolation(error)) throw error
    const raced = await db
      .select()
      .from(schema.householdSettings)
      .where(eq(schema.householdSettings.id, SETTINGS_ROW_ID))
      .get()
    if (!raced) throw error
    return raced.timezone
  }
}

/** Current Week identity + household today from settings timezone. */
export async function currentWeekClock(
  event?: H3Event,
  instant: Date = serverNow(),
): Promise<WeekClock> {
  const timeZone = await resolveHouseholdTimezone(event)
  return weekClockAt(instant, timeZone)
}
