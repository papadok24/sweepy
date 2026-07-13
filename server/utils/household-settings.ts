import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { db, schema } from 'hub:db'
import { useEnv } from './env'
import { assertValidTimeZone, weekClockAt, type WeekClock } from './week'
import { isUniqueViolation } from './db-errors'

const SETTINGS_ROW_ID = 1

/**
 * Resolve the household IANA timezone. If no settings row exists yet, seed
 * once from validated `householdTimezone` runtime config, then treat the DB as
 * authoritative. Fail closed — never invent UTC.
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

  const timezone = assertValidTimeZone(useEnv(event).householdTimezone)

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
  instant: Date = new Date(),
): Promise<WeekClock> {
  const timeZone = await resolveHouseholdTimezone(event)
  return weekClockAt(instant, timeZone)
}
